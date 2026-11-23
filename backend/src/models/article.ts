import { DataTypes } from 'sequelize';
import { sequelize } from '../db';

// A help article that the knowledge base assistant can answer from.
export const Article = sequelize.define(
  'Article',
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
    body: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    createdBy: {
      type: DataTypes.UUID,
    },
  },
  {
    tableName: 'articles',
    underscored: true,
  },
);
