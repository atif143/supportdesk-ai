import { DataTypes } from 'sequelize';
import { sequelize } from '../db';

export const AiLog = sequelize.define(
  'AiLog',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    userId: {
      type: DataTypes.UUID,
    },
    feature: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    model: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    inputTokens: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    outputTokens: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    latencyMs: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('success', 'error', 'cancelled'),
      allowNull: false,
    },
    errorMessage: {
      type: DataTypes.TEXT,
    },
  },
  {
    tableName: 'ai_logs',
    underscored: true,
    updatedAt: false,
  },
);
