import { supabase } from '@/lib/supabase';

export async function assignDroneToOrder(orderId: string) {
  try {
    // 1. Получаем данные заказа (чтобы узнать вес груза и координаты)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('weight, from_lat, from_lon')
      .eq('id', orderId)
      .single();

    if (orderError || !order) throw new Error('Заказ не найден');

    // 2. Ищем подходящий свободный дрон
    // Условия: свободен (idle), батарея > 30%, может поднять этот вес
    const { data: availableDrones, error: dronesError } = await supabase
      .from('drones')
      .select('*')
      .eq('status', 'idle')
      .gte('battery_level', 30)
      .gte('max_payload_kg', order.weight)
      .limit(1); // Для начала берем первый попавшийся подходящий

    if (dronesError) throw new Error('Ошибка поиска флота');
    
    if (!availableDrones || availableDrones.length === 0) {
      console.log('Нет доступных бортов для этого задания');
      return { success: false, message: 'Нет свободных дронов' };
    }

    const assignedDrone = availableDrones[0];

    // 3. Бронируем дрон и обновляем заказ (Транзакция)
    // Меняем статус заказа на 'loading' и привязываем drone_id
    await supabase
      .from('orders')
      .update({ 
        status: 'loading',
        drone_id: assignedDrone.id 
      })
      .eq('id', orderId);

    // Отправляем дрон на миссию
    await supabase
      .from('drones')
      .update({ status: 'on_mission' })
      .eq('id', assignedDrone.id);

    return { 
      success: true, 
      drone: assignedDrone,
      message: `Борт ${assignedDrone.callsign} назначен на миссию` 
    };

  } catch (error) {
    console.error('Ошибка диспетчера:', error);
    return { success: false, message: 'Внутренняя ошибка системы' };
  }
}