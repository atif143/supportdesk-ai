import { DataTypes } from 'sequelize';
import { sequelize } from '../db';

export const Ticket = sequelize.define(
  'Ticket',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed'),
      defaultValue: 'open',
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      defaultValue: 'medium',
    },
    category: {
      type: DataTypes.ENUM('billing', 'bug', 'feature_request', 'account', 'other'),
      defaultValue: 'other',
    },
    requesterId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    assigneeId: {
      type: DataTypes.UUID,
    },
    // What the AI suggested when the ticket was created
    aiCategory: {
      type: DataTypes.STRING,
    },
    aiPriority: {
      type: DataTypes.STRING,
    },
    aiReason: {
      type: DataTypes.TEXT,
    },
    needsReview: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: 'tickets',
    underscored: true,
  },
);
