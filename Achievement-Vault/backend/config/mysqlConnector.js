// backend/config/mysqlConnector.js
import mysql from 'mysql2';

const MY_SQL_DB_HOST = process.env.AV_MY_SQL_DB_HOST;
const MY_SQL_DB_USER = process.env.AV_MY_SQL_DB_USER;
const MY_SQL_DB_PASS = process.env.AV_MY_SQL_DB_PASS;
const MY_SQL_DB_DATABASE_NAME = process.env.AV_MY_SQL_DB_DATABASE_NAME;


const pool = mysql.createPool({ 
    host: MY_SQL_DB_HOST,
    user: MY_SQL_DB_USER,
    password: MY_SQL_DB_PASS,
    database: MY_SQL_DB_DATABASE_NAME,
    port: 25060,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
}).promise();

export default pool;
