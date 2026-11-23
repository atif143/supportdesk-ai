const crypto = require('crypto');

// Sample help articles for the knowledge base assistant.
// Each body has a few short paragraphs (about 1,000 characters), so each article fits in one chunk.
const ARTICLES = [
  {
    title: 'How to change the billing email address',
    body: `Only the workspace owner or an admin can change the billing email. The billing email receives invoices, payment receipts, renewal reminders and any message about a failed payment. It is separate from the email people use to sign in.

To change it, open Settings, then Billing, then Billing contact. Select Edit next to the current address, type the new address and save. We send a verification link to the new address. The change is only saved after someone clicks that link, and the link expires after 24 hours. Until it is verified, the old address keeps receiving billing email.

The new address is used on the next invoice we issue. Invoices that were already sent keep the address they were issued with. If you also want to receive product updates at the new address, update it separately under Settings, then Account, then Email notifications.

If the verification email does not arrive, check the spam folder and try again. If your domain blocks our messages, add billing@supportdesk.example to the allowlist of your mail server.`,
  },
  {
    title: 'Understanding your invoices and receipts',
    body: `Every paid workspace gets an invoice on the first day of each billing period. Invoices are available as PDF files under Settings, then Billing, then Invoices. Each invoice shows the invoice number, the billing period, the plan, the number of seats and any usage charges.

Invoice numbers look like INV-2026-1043. Give this number when you contact support about a payment. If you need a receipt instead of an invoice, open the invoice and choose Download receipt; the receipt shows the amount that was actually charged.

Tax details such as a VAT number or company registration number can be added under Settings, then Billing, then Billing details. Changes to tax details only apply to invoices issued after the change, not to invoices already sent.

If a payment fails, the invoice stays open and we retry the card. You can see the payment status next to each invoice. An open invoice becomes an overdue invoice after seven days, and a banner appears in the app until it is paid.`,
  },
  {
    title: 'Refunds: policy and how to request one',
    body: `We offer a full refund within 30 days of the first payment on a new subscription. After that period, payments are not refundable. If you cancel a monthly plan, the current month is not prorated, but you keep access until the end of the period you paid for.

To request a refund, open a ticket in the Billing category and include the invoice number and the reason for the request. You can also email billing@supportdesk.example from the billing address on the account. We answer refund requests within two business days.

Approved refunds go back to the original payment method. Card refunds usually arrive in 5 to 10 business days, depending on your bank. Bank transfers can take up to 15 business days. We cannot send a refund to a different card or to another person.

If you were charged twice for the same invoice, you do not need to request a refund. The duplicate payment is found automatically and returned within 3 to 5 business days. Contact support if it has not arrived after 10 business days.`,
  },
  {
    title: 'Reset a forgotten password',
    body: `To reset a forgotten password, open the login page and choose Forgot password. Type the email address on your account and we send a reset link. The link can be used once and expires after 60 minutes.

Open the link in the same browser where you requested it. Choose a new password with at least 8 characters. For safety, all other sessions are signed out after a password reset, so you will need to sign in again on your phone and other devices.

If the email does not arrive, check the spam folder and make sure the address is spelled correctly. Ask your mail administrator to allow messages from no-reply@supportdesk.example. Reset emails are only sent to addresses that belong to a workspace.

If your workspace uses single sign-on, the password is managed by your identity provider. Use the Forgot password link on your identity provider's login page instead. If you still cannot get in, contact support; we may ask the workspace owner to confirm the request.`,
  },
  {
    title: 'Set up two-factor authentication',
    body: `Two-factor authentication adds a second step to login. Open Settings, then Security, then Two-factor authentication and choose Set up. You can use an authenticator app such as Google Authenticator or 1Password, or receive a code by SMS.

Scan the QR code with your authenticator app and enter the six-digit code to finish setup. You are then shown ten recovery codes. Store them somewhere safe, such as a password manager. Each code can be used once if you lose your phone.

Workspace owners and admins can require two-factor authentication for everyone under Settings, then Security, then Login policy. People who have not set it up are asked to do so the next time they sign in.

If you lose your phone, sign in with a recovery code and set up a new device under Security. If you have also lost the recovery codes, an admin can reset two-factor authentication for you. For an owner account, contact support and be ready to prove that you own the workspace.`,
  },
  {
    title: 'Invite team members and manage roles',
    body: `Admins can invite people under Settings, then Team, then Invite people. Type one or more email addresses, choose a role and send the invitation. Each invited person receives an email with a link to join the workspace.

There are four roles. Owners can do everything, including billing and deleting the workspace. Admins can manage tickets, articles and team members, but cannot change the plan. Agents can read and answer tickets. Viewers can read tickets and reports but cannot reply.

An invitation expires after 7 days. You can resend it from the Team list. People who have not accepted yet are shown as Pending and do not count as a paid seat until they join.

To change someone's role, open the Team list, open the person's menu and choose Change role. To remove access, choose Remove from workspace. Removed people lose access immediately, but the tickets they worked on stay in the workspace.`,
  },
  {
    title: 'Delete your account or workspace',
    body: `You can delete your own account under Settings, then Account, then Delete account. If you are the workspace owner, transfer ownership to another admin first, or delete the whole workspace instead.

Deleting a workspace starts a 30-day grace period. During this time the workspace is read-only: agents can still read tickets, but nobody can reply, create tickets or change settings. An owner can cancel the deletion from the same page before the 30 days end.

After the grace period the workspace, its tickets, comments, articles and files are deleted permanently. Custom domains and API keys are removed as well. This cannot be undone, so export anything you need beforehand from Settings, then Data, then Export.

Deleting your personal account does not delete the workspace. Your name is removed from old comments, and the comments are shown as written by a former team member.`,
  },
  {
    title: 'Export your data',
    body: `Workspace owners and admins can export data under Settings, then Data, then Export. Choose CSV for spreadsheets or JSON if you plan to import the data into another system. You can export tickets, contacts, comments, articles and a list of team members.

Start an export and we prepare a download link. Small exports are ready in a few minutes; large workspaces with more than 100,000 tickets can take up to an hour. The link is sent to your email and expires after 24 hours for security.

Files are delivered as a ZIP archive. Ticket text is included, but file attachments are not; download those separately from each ticket. Passwords, API keys and payment card numbers are never included in an export.

If you need a scheduled export, use the API instead. Create an API key with read access and request the export endpoint once a day. API exports use the same data and are limited to three requests per hour.`,
  },
  {
    title: 'Create and rotate API keys',
    body: `API keys let your own tools read and write data in the workspace. Create one under Settings, then Developer, then API keys, and choose the scopes it needs: read for GET requests, write for creating and updating, and admin for settings and team changes.

The full key is shown only once, right after you create it. Copy it and store it in a secret manager. We store only a hash, so a lost key cannot be shown again; create a new key instead.

Use the key in the Authorization header as a Bearer token. Keys are tied to the workspace, not to a person, so they keep working if the person who created them leaves. Treat them like passwords and never put them in a browser or a public repository.

To rotate a key, create a new one, update your tools, then revoke the old one. We recommend rotating every 90 days. The API keys page shows when each key was last used. Revoke a key immediately if it may have leaked.`,
  },
  {
    title: 'Upgrade or downgrade your plan',
    body: `Open Settings, then Billing, then Change plan to move between Free, Team and Business. Upgrades start immediately. We charge the difference for the rest of the current period and your new limits apply at once.

Downgrades and cancellations take effect at the end of the current billing period, so you keep the features you paid for until then. If the new plan has fewer seats than you use, remove extra team members before the change; otherwise the workspace becomes read-only for the extra people.

Annual plans can be changed once per year. To move from annual to monthly, contact support at least 14 days before the renewal date. We do not refund the unused part of an annual plan, except under the 30-day refund policy.

The Free plan includes one agent and 100 tickets per month. The Team plan includes five agents and 5,000 tickets per month. The Business plan has no ticket limit and adds audit logs and single sign-on.`,
  },
  {
    title: 'Update your payment method',
    body: `Change the card used for the subscription under Settings, then Billing, then Payment method. Choose Update card, enter the new details and save. The new card is charged at the next renewal. You can keep a backup card; if the first card fails, we try the backup before marking the invoice overdue.

Payments may need an extra confirmation step from your bank, known as 3-D Secure. If the window closes before you confirm, the payment is marked as failed and you can try again from the invoice.

When a payment fails, we retry it three times over seven days and email the billing contact each time. If all retries fail, the workspace moves to the Free plan and paid features stop. Your data is kept for 90 days, so you can update the card and restore the plan.

Annual plans can pay by bank transfer. Choose Bank transfer on the invoice, and the invoice shows the account details and a reference number. Include the reference so the payment is matched to your workspace.`,
  },
  {
    title: 'Understanding usage limits and overages',
    body: `Each plan has monthly limits for tickets, AI actions and file storage. You can see current usage and the limit for each item under Settings, then Usage. Usage resets at the start of each billing period, on the same day as your invoice.

When a workspace reaches 80 percent of a limit, a banner appears for admins. At 100 percent, new tickets and AI actions are paused until the period resets or the plan is upgraded. Reading and replying to existing tickets still works.

Business workspaces can allow overages instead of pausing. Overage is billed at the end of the month: extra tickets cost 2 USD per 100, extra AI actions cost 1 USD per 1,000, and extra storage costs 5 USD per 10 GB. You can turn overages off at any time.

Ticket counts include new tickets from email, the API and the web form, but not comments on existing tickets. AI actions include classification, summaries and knowledge base answers. Deleting files does not free storage until the next day.`,
  },
];

module.exports = {
  async up(queryInterface) {
    // Use the demo admin as the author. The column may be empty if that user is removed.
    const admins = await queryInterface.sequelize.query(
      "SELECT id FROM users WHERE email = 'admin@example.com'",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    const createdBy = admins.length > 0 ? admins[0].id : null;

    const now = new Date();
    const rows = ARTICLES.map((article) => ({
      id: crypto.randomUUID(),
      title: article.title,
      body: article.body,
      created_by: createdBy,
      created_at: now,
      updated_at: now,
    }));

    await queryInterface.bulkInsert('articles', rows);
  },

  async down(queryInterface) {
    const titles = ARTICLES.map((article) => article.title);
    await queryInterface.bulkDelete('articles', { title: titles });
  },
};
