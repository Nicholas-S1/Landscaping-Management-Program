import { listItems } from '../services/resource';
import { Option, useLoad } from '../components/ui';

export const personOptions = (people: any[] | null): Option[] =>
  (people || []).map((person) => ({ value: person.id, label: `${person.lastName}, ${person.firstName}` }));

// Customer directory (available to all staff)
export const useCustomers = () => useLoad(() => listItems('/users/customers', {}, 'users'), []);

// Active employees and managers (the full user list is manager-only)
export const useStaff = () =>
  useLoad(
    async () =>
      (await listItems('/users', {}, 'users')).filter((user) => ['employee', 'manager'].includes(user.role) && user.isActive),
    []
  );
