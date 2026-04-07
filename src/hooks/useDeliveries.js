import { useFirestoreArray } from './useFirestoreArray';

// Subscribes to the deliveries index (summary list, newest-first).
// Returns [deliveries, setDeliveries] where deliveries is DeliveryIndexEntry[].
export function useDeliveries() {
  const [data, setData] = useFirestoreArray('deliveries_index');
  const sorted = [...data].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return [sorted, setData];
}
