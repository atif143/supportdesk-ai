import { DataTypes } from 'sequelize';
import { sequelize } from '../db';

export const TicketSummary = sequelize.define(
  'TicketSummary',
  {
    ticketId: {
      type: DataTypes.UUID,
      primaryKey: true,
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    problem: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    sentiment: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    draftReply: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    tableName: 'ticket_summaries',
    underscored: true,
    updatedAt: false,
  },
);
