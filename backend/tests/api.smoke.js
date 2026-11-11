// End-to-end API check against a running server with seeded data:
//   npm run seed && npm start    (in one terminal)
//   npm run test:api             (in another)
// It creates records, so point it at a development database only.
const BASE = process.env.API_URL || 'http://localhost:5000';
const PASSWORD = process.env.SEED_PASSWORD || 'ChangeMe123!';

let failures = 0;
const check = (label, condition, detail = '') => {
  if (condition) return console.log(`  ok    ${label}`);
  failures += 1;
  console.log(`  FAIL  ${label} ${detail}`);
};

const call = async (method, path, { token, body } = {}) => {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await response.json().catch(() => ({}));
  return { status: response.status, data: json.data, message: json.message };
};

const login = async (email) => {
  const result = await call('POST', '/api/auth/login', { body: { email, password: PASSWORD } });
  if (result.status !== 200) throw new Error(`Could not sign in as ${email}: ${result.message}`);
  return { token: result.data.accessToken, user: result.data.user };
};

const expectStatus = async (label, expected, method, path, options) => {
  const result = await call(method, path, options);
  check(`${label} -> ${expected}`, result.status === expected, `(got ${result.status}: ${result.message || ''})`);
  return result;
};

(async () => {
  const admin = await login('owner@example.com');
  const manager = await login('manager@example.com');
  const employee = await login('employee@example.com');
  const customer = await login('customer@example.com');
  const other = await login('customer2@example.com');
  const today = new Date();
  const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  console.log('Accounts and permissions');
  const stamp = Date.now();
  const signup = await expectStatus('public sign-up', 201, 'POST', '/api/auth/register', {
    body: { email: `new${stamp}@example.com`, password: 'secret123', firstName: 'New', lastName: 'Person', role: 'employee' }
  });
  check('sign-up cannot choose a staff role', signup.data?.user.role === 'customer');
  await expectStatus('customer cannot list users', 403, 'GET', '/api/users', { token: customer.token });
  await expectStatus('customer cannot list routes', 403, 'GET', '/api/routes', { token: customer.token });
  await expectStatus('customer cannot list trucks', 403, 'GET', '/api/trucks', { token: customer.token });
  await expectStatus('manager cannot hire an employee', 403, 'POST', '/api/users', {
    token: manager.token, body: { email: `hire${stamp}@example.com`, password: 'secret123', firstName: 'A', lastName: 'B', role: 'employee' }
  });
  const hired = await expectStatus('owner hires an employee', 201, 'POST', '/api/users', {
    token: admin.token, body: { email: `hire${stamp}@example.com`, password: 'secret123', firstName: 'Hank', lastName: 'Hire', role: 'employee', hourlyRate: 19 }
  });
  const hiredId = hired.data.user.id;
  await expectStatus('manager edits employee pay', 200, 'PUT', `/api/users/${hiredId}`, { token: manager.token, body: { hourlyRate: 20, phone: '555-0199' } });
  await expectStatus('manager cannot promote', 403, 'PUT', `/api/users/${hiredId}`, { token: manager.token, body: { role: 'manager' } });
  await expectStatus('manager cannot fire', 403, 'PUT', `/api/users/${hiredId}`, { token: manager.token, body: { isActive: false } });
  const promoted = await expectStatus('owner promotes to manager', 200, 'PUT', `/api/users/${hiredId}`, { token: admin.token, body: { role: 'manager' } });
  check('role is now manager', promoted.data?.user.role === 'manager');
  await expectStatus('owner fires (deactivates)', 200, 'DELETE', `/api/users/${hiredId}`, { token: admin.token });
  await expectStatus('fired account cannot sign in', 401, 'POST', '/api/auth/login', { body: { email: `hire${stamp}@example.com`, password: 'secret123' } });
  const contacts = await expectStatus('customer contact list', 200, 'GET', '/api/users/contacts', { token: customer.token });
  check('customers can only message the office', contacts.data.users.every((u) => ['manager', 'admin'].includes(u.role)));
  await expectStatus('employee sees customer directory', 200, 'GET', '/api/users/customers', { token: employee.token });

  console.log('Time clock');
  await call('POST', '/api/time-entries/clock-out', { token: employee.token });
  await expectStatus('clock in', 201, 'POST', '/api/time-entries/clock-in', { token: employee.token });
  await expectStatus('double clock in rejected', 400, 'POST', '/api/time-entries/clock-in', { token: employee.token });
  const out = await expectStatus('clock out', 200, 'POST', '/api/time-entries/clock-out', { token: employee.token });
  const entryId = out.data.timeEntry.id;
  await expectStatus('employee cannot adjust time', 403, 'PUT', `/api/time-entries/${entryId}`, { token: employee.token, body: {} });
  const start = new Date(today); start.setHours(8, 0, 0, 0);
  const end = new Date(today); end.setHours(16, 30, 0, 0);
  const adjusted = await expectStatus('manager adjusts time', 200, 'PUT', `/api/time-entries/${entryId}`, {
    token: manager.token, body: { clockIn: start, clockOut: end, adjustmentReason: 'Forgot to clock in' }
  });
  check('hours recalculated to 8.5', adjusted.data?.timeEntry.totalHours === 8.5, `(got ${adjusted.data?.timeEntry.totalHours})`);

  console.log('Trucks and routes');
  const myRoute = await expectStatus("employee's route for today", 200, 'GET', '/api/routes/today/my-route', { token: employee.token });
  const route = myRoute.data.route;
  check('route has ordered stops', route && route.customers.length === 2 && route.customers[0].orderIndex === 0);
  const firstStop = route.customers[0];
  const stop = await expectStatus('employee completes a stop', 200, 'PUT', `/api/routes/${route.id}/customers/${firstStop.customerId}`, { token: employee.token, body: { status: 'completed' } });
  check('arrival and departure stamped', Boolean(stop.data?.routeCustomer.actualArrival && stop.data?.routeCustomer.actualDeparture));
  await expectStatus('manager reorders stops', 200, 'PUT', `/api/routes/${route.id}/order`, {
    token: manager.token, body: { customerIds: [route.customers[1].customerId, route.customers[0].customerId] }
  });
  const reordered = await call('GET', `/api/routes/${route.id}`, { token: manager.token });
  check('new stop order is returned', reordered.data.route.customers[0].customerId === route.customers[1].customerId);
  const truck = await expectStatus('manager creates truck', 201, 'POST', '/api/trucks', { token: manager.token, body: { name: `Truck ${stamp}` } });
  await expectStatus('manager assigns crew', 201, 'POST', `/api/trucks/${truck.data.truck.id}/assign`, { token: manager.token, body: { employeeIds: [employee.user.id], roles: ['driver'] } });
  const oldTruckCrew = await call('GET', `/api/trucks/${route.truckId}/assignments?date=${ymd(today)}`, { token: manager.token });
  check('employee is moved off the previous truck', oldTruckCrew.data.assignments.every((a) => a.employeeId !== employee.user.id));
  await call('POST', `/api/trucks/${route.truckId}/assign`, { token: manager.token, body: { employeeIds: [employee.user.id], roles: ['driver'] } });

  console.log('Property notes, photos and messages');
  await expectStatus('customer leaves a property note', 201, 'POST', '/api/property-notes', { token: customer.token, body: { content: 'Please avoid the new flower bed.' } });
  await expectStatus('employee leaves a private note', 201, 'POST', '/api/property-notes', { token: employee.token, body: { customerId: customer.user.id, content: 'Sprinkler head broken by driveway', isPrivate: true } });
  const customerNotes = await call('GET', '/api/property-notes', { token: customer.token });
  check('customer does not see private staff notes', customerNotes.data.propertyNotes.every((n) => !n.isPrivate));
  const otherNotes = await call('GET', `/api/property-notes?customerId=${customer.user.id}`, { token: other.token });
  check("customers cannot read another customer's notes", otherNotes.data.propertyNotes.every((n) => n.customerId === other.user.id));
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
  const form = new FormData();
  form.append('file', new Blob([png], { type: 'image/png' }), 'yard.png');
  const uploaded = await fetch(`${BASE}/api/uploads`, { method: 'POST', headers: { Authorization: `Bearer ${customer.token}` }, body: form });
  const uploadJson = await uploaded.json();
  check('photo upload -> 201', uploaded.status === 201, `(got ${uploaded.status})`);
  const served = uploadJson.data ? await fetch(`${BASE}${uploadJson.data.url}`) : { status: 0 };
  check('uploaded photo is served', served.status === 200);
  const badForm = new FormData();
  badForm.append('file', new Blob(['<script>'], { type: 'text/html' }), 'x.html');
  const rejected = await fetch(`${BASE}/api/uploads`, { method: 'POST', headers: { Authorization: `Bearer ${customer.token}` }, body: badForm });
  check('non-image upload rejected -> 400', rejected.status === 400, `(got ${rejected.status})`);
  await expectStatus('customer messages the office', 201, 'POST', '/api/messages', { token: customer.token, body: { recipientId: manager.user.id, content: 'Can you come Thursday instead?' } });
  const unread = await call('GET', '/api/messages/unread/count', { token: manager.token });
  check('manager has unread mail', unread.data.count >= 1);

  console.log('Jobs, inventory and automatic invoicing');
  const stock = await call('GET', '/api/inventory', { token: employee.token });
  const fertilizer = stock.data.items.find((i) => i.category === 'fertilizer');
  const low = await call('GET', '/api/inventory?low=true', { token: manager.token });
  check('low-stock list contains only items at or below reorder level', low.data.items.length >= 1 && low.data.items.every((i) => i.currentQuantity <= i.reorderLevel));
  await expectStatus('employee cannot create jobs', 403, 'POST', '/api/jobs', { token: employee.token, body: { customerId: customer.user.id, title: 'x' } });
  const job = await expectStatus('manager creates job', 201, 'POST', '/api/jobs', {
    token: manager.token,
    body: { customerId: customer.user.id, assignedToId: employee.user.id, title: 'Fertilizer application', jobType: 'fertilizing', scheduledDate: ymd(today), estimatedCost: 120, internalNotes: 'Upsell aeration' }
  });
  const jobId = job.data.item.id;
  await expectStatus('employee starts job', 200, 'POST', `/api/jobs/${jobId}/start`, { token: employee.token });
  const done = await expectStatus('employee completes job', 200, 'POST', `/api/jobs/${jobId}/complete`, {
    token: employee.token, body: { materialsUsed: [{ inventoryId: fertilizer.id, quantity: 2 }], afterPhotos: [uploadJson.data?.url] }
  });
  check('invoice generated on completion', done.data?.invoice && Number(done.data.invoice.totalAmount) === 120);
  const stockAfter = await call('GET', '/api/inventory', { token: employee.token });
  check('inventory deducted', stockAfter.data.items.find((i) => i.id === fertilizer.id).currentQuantity === fertilizer.currentQuantity - 2);
  await expectStatus('completing twice rejected', 400, 'POST', `/api/jobs/${jobId}/complete`, { token: employee.token });
  const customerJobs = await call('GET', '/api/jobs', { token: customer.token });
  check('customer sees own jobs only, without internal notes', customerJobs.data.items.length > 0 && customerJobs.data.items.every((j) => j.customerId === customer.user.id && j.internalNotes === undefined));
  await expectStatus("customer cannot open another customer's job", 403, 'GET', `/api/jobs/${jobId}`, { token: other.token });
  const request = await expectStatus('customer requests a service', 201, 'POST', '/api/jobs', { token: customer.token, body: { title: 'Mulch the front beds', jobType: 'mulching', customerId: other.user.id, status: 'completed', estimatedCost: 0 } });
  check('request is pending and for the requester', request.data?.item.status === 'pending' && request.data.item.customerId === customer.user.id);

  console.log('Invoices and payments');
  const invoiceId = done.data.invoice.id;
  await expectStatus('employee cannot see invoices', 403, 'GET', '/api/invoices', { token: employee.token });
  await expectStatus("customer cannot open another customer's invoice", 403, 'GET', `/api/invoices/${invoiceId}`, { token: other.token });
  await expectStatus('customer cannot record a payment', 403, 'POST', `/api/invoices/${invoiceId}/payments`, { token: customer.token, body: { amount: 120 } });
  await expectStatus('overpayment rejected', 400, 'POST', `/api/invoices/${invoiceId}/payments`, { token: manager.token, body: { amount: 500 } });
  const partial = await expectStatus('partial payment', 200, 'POST', `/api/invoices/${invoiceId}/payments`, { token: manager.token, body: { amount: 50, paymentMethod: 'check' } });
  check('still unpaid after partial payment', partial.data?.item.status === 'sent');
  const paid = await expectStatus('final payment', 200, 'POST', `/api/invoices/${invoiceId}/payments`, { token: manager.token, body: { amount: 70, paymentMethod: 'check' } });
  check('invoice marked paid', paid.data?.item.status === 'paid');
  const manual = await expectStatus('manager creates invoice with tax', 201, 'POST', '/api/invoices', {
    token: manager.token, body: { customerId: customer.user.id, taxRate: 10, discountAmount: 5, status: 'sent', lineItems: [{ description: 'Tree removal', quantity: 2, rate: 100 }] }
  });
  check('totals computed (200 + 10% - 5 = 215)', Number(manual.data?.item.totalAmount) === 215, `(got ${manual.data?.item.totalAmount})`);
  await expectStatus('payment reminder', 200, 'POST', `/api/invoices/${manual.data.item.id}/remind`, { token: manager.token });
  await expectStatus('online card payment reports not set up', 501, 'POST', `/api/invoices/${manual.data.item.id}/pay`, { token: customer.token });
  const past = new Date(today); past.setDate(past.getDate() - 3);
  const late = await call('POST', '/api/invoices', { token: manager.token, body: { customerId: customer.user.id, status: 'sent', dueDate: past, lineItems: [{ description: 'Late', quantity: 1, rate: 10 }] } });
  const bills = await call('GET', '/api/invoices', { token: customer.token });
  check('past-due invoice shows as overdue', bills.data.items.find((i) => i.id === late.data.item.id)?.status === 'overdue');
  check('customer sees no drafts', bills.data.items.every((i) => i.status !== 'draft' && i.customerId === customer.user.id));

  console.log('Service plans and scheduling');
  const plan = await expectStatus('manager creates weekly plan', 201, 'POST', '/api/service-plans', {
    token: manager.token, body: { customerId: other.user.id, planName: 'Weekly mowing', planType: 'weekly', recurringAmount: 160, billingCycle: 'monthly', startDate: ymd(today) }
  });
  const run = await expectStatus('billing run', 200, 'POST', '/api/service-plans/run-billing', { token: manager.token });
  check('plan invoiced and jobs generated', run.data.invoicesCreated >= 1 && run.data.jobsCreated >= 2, JSON.stringify(run.data));
  const rerun = await call('POST', '/api/service-plans/run-billing', { token: manager.token });
  check('second run bills nothing twice', rerun.data.invoicesCreated === 0 && rerun.data.jobsCreated === 0, JSON.stringify(rerun.data));
  await expectStatus('customer sees own plans', 200, 'GET', '/api/service-plans', { token: other.token });
  await expectStatus('cancel plan', 200, 'DELETE', `/api/service-plans/${plan.data.item.id}`, { token: manager.token });
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const appointment = await expectStatus('customer books appointment', 201, 'POST', '/api/appointments', { token: customer.token, body: { title: 'Estimate for patio', appointmentDate: ymd(tomorrow), startTime: '10:00' } });
  const nextWeek = new Date(today); nextWeek.setDate(nextWeek.getDate() + 7);
  const moved = await expectStatus('customer reschedules', 200, 'PUT', `/api/appointments/${appointment.data.item.id}`, { token: customer.token, body: { appointmentDate: ymd(nextWeek) } });
  check('status becomes rescheduled', moved.data?.item.status === 'rescheduled');
  await expectStatus("another customer cannot change it", 403, 'PUT', `/api/appointments/${appointment.data.item.id}`, { token: other.token, body: { status: 'cancelled' } });
  await expectStatus('route moved for weather', 200, 'PUT', `/api/routes/${route.id}`, { token: manager.token, body: { scheduledDate: ymd(tomorrow) } });
  const movedJobs = await call('GET', `/api/jobs?routeId=${route.id}`, { token: manager.token });
  check('unfinished jobs moved with the route', movedJobs.data.items.filter((j) => j.status !== 'completed').every((j) => j.scheduledDate === ymd(tomorrow)));
  await call('PUT', `/api/routes/${route.id}`, { token: manager.token, body: { scheduledDate: ymd(today) } });

  console.log('Equipment and time off');
  const mower = await expectStatus('manager adds equipment', 201, 'POST', '/api/equipment', { token: manager.token, body: { name: 'Backpack blower', category: 'blower', status: 'maintenance', assignedToId: employee.user.id } });
  const mine = await call('GET', '/api/equipment?mine=true', { token: employee.token });
  check('employee sees assigned maintenance', mine.data.items.some((e) => e.id === mower.data.item.id));
  await expectStatus('employee cannot add equipment', 403, 'POST', '/api/equipment', { token: employee.token, body: { name: 'x' } });
  const log = await expectStatus('employee logs maintenance', 201, 'POST', `/api/equipment/${mower.data.item.id}/maintenance`, { token: employee.token, body: { description: 'Replaced spark plug', cost: 12.5, returnToService: true } });
  check('equipment back in service', log.data?.equipment.status === 'available');
  const timeOff = await expectStatus('employee requests time off', 201, 'POST', '/api/time-off', { token: employee.token, body: { startDate: ymd(nextWeek), endDate: ymd(nextWeek), type: 'personal' } });
  await expectStatus('employee cannot approve', 403, 'PUT', `/api/time-off/${timeOff.data.item.id}/review`, { token: employee.token, body: { status: 'approved' } });
  await expectStatus('manager approves', 200, 'PUT', `/api/time-off/${timeOff.data.item.id}/review`, { token: manager.token, body: { status: 'approved' } });

  console.log('Reports and announcements');
  const ops = await expectStatus('manager operations report', 200, 'GET', '/api/reports/operations', { token: manager.token });
  check('report has employee productivity', ops.data.productivity.some((p) => p.id === employee.user.id && p.hoursWorked >= 8.5 && p.jobsCompleted >= 1));
  await expectStatus('manager cannot see finances', 403, 'GET', '/api/reports/finances', { token: manager.token });
  const finance = await expectStatus('owner finance report', 200, 'GET', '/api/reports/finances', { token: admin.token });
  check('finance report has collected revenue and labor cost', finance.data.collected >= 120 && finance.data.laborCost > 0, JSON.stringify({ c: finance.data.collected, l: finance.data.laborCost }));
  await expectStatus('manager cannot broadcast', 403, 'POST', '/api/broadcasts', { token: manager.token, body: { content: 'x' } });
  const blast = await expectStatus('owner announcement to all staff', 201, 'POST', '/api/broadcasts', { token: admin.token, body: { content: 'Rain delay: start at 10am tomorrow.' } });
  check('announcement delivered in-app; texting reported as not configured', blast.data.recipients >= 2 && blast.data.sms.configured === false);
  await expectStatus('malformed id returns 400, not 500', 400, 'GET', '/api/jobs/not-a-uuid', { token: manager.token });

  console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
