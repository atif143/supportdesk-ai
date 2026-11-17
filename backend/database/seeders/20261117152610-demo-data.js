const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const DEMO_PASSWORD = 'password123';

const STATUSES = ['open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const CATEGORIES = ['billing', 'bug', 'feature_request', 'account', 'other'];
const TITLES = [
  'Charged twice this month',
  'Cannot log in',
  'Please add dark mode',
  'Change my billing email',
  'App crashes on start',
  'Refund request',
  'Password reset email not arriving',
  'Export to CSV is broken',
];

// Picks a random item from a list
function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

module.exports = {
  async up(queryInterface) {
    // 1. Demo users: one for each role
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    const admin = { id: crypto.randomUUID(), name: 'Admin User', email: 'admin@example.com', role: 'admin' };
    const agent = { id: crypto.randomUUID(), name: 'Agent User', email: 'agent@example.com', role: 'agent' };
    const customer = { id: crypto.randomUUID(), name: 'Customer User', email: 'customer@example.com', role: 'customer' };

    await queryInterface.bulkInsert(
      'users',
      [admin, agent, customer].map((user) => ({ ...user, password_hash: passwordHash })),
    );

    // 2. 10,000 tickets, created over the last 30 days
    const tickets = [];
    for (let i = 1; i <= 10000; i++) {
      const createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      tickets.push({
        id: crypto.randomUUID(),
        title: `${pick(TITLES)} #${i}`,
        description: 'Demo ticket created by the seed script.',
        status: pick(STATUSES),
        priority: pick(PRIORITIES),
        category: pick(CATEGORIES),
        requester_id: customer.id,
        assignee_id: Math.random() < 0.5 ? agent.id : null, // about half are assigned
        created_at: createdAt,
        updated_at: createdAt,
      });
    }

    // Insert 1,000 at a time, so one query is not too big
    for (let i = 0; i < tickets.length; i += 1000) {
      await queryInterface.bulkInsert('tickets', tickets.slice(i, i + 1000));
    }
  },

  async down(queryInterface) {
    const emails = ['admin@example.com', 'agent@example.com', 'customer@example.com'];
    await queryInterface.sequelize.query(
      'DELETE FROM tickets WHERE requester_id IN (SELECT id FROM users WHERE email IN (:emails))',
      { replacements: { emails } },
    );
    await queryInterface.bulkDelete('users', { email: emails });
  },
};
