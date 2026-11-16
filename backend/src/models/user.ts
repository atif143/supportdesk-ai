import { DataTypes } from 'sequelize';
import { sequelize } from '../db';

export const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('customer', 'agent', 'admin'),
      defaultValue: 'customer',
    },
  },
  {
    tableName: 'users',
    underscored: true,
  },
);
