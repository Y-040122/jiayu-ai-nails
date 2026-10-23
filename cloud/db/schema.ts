import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const state=sqliteTable('demo_state',{id:text('id').primaryKey(),revision:integer('revision').notNull(),body:text('body').notNull()});
export const quota=sqliteTable('ai_quota',{id:text('id').primaryKey(),used:integer('used').notNull()});
