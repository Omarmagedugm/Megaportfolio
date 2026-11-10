import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const content=sqliteTable('portfolio_content',{id:integer('id').primaryKey(),payload:text('payload').notNull(),revision:integer('revision').notNull().default(0)});
export const sessions=sqliteTable('admin_sessions',{token:text('token').primaryKey(),expires:integer('expires').notNull()});
export const attempts=sqliteTable('admin_attempts',{key:text('key').primaryKey(),count:integer('count').notNull(),reset:integer('reset').notNull()});
