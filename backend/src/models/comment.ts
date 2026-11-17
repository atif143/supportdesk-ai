import { DataTypes } from 'sequelize';
import { sequelize } from '../db';
import { User } from './user';

export const Comment = sequelize.define(
  'Comment',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    ticketId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    authorId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    visibility: {
      type: DataTypes.ENUM('public', 'internal'),
      defaultValue: 'public',
    },
  },
  {
    tableName: 'comments',
    underscored: true,
    updatedAt: false,
  },
);

// Each comment has one author (a user)
Comment.belongsTo(User, { foreignKey: 'authorId', as: 'author' });
