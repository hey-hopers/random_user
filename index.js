import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// Função para abrir conexão com banco de dados
async function conectar() {

  try {

    return open({
        filename: './database.db',
        driver: sqlite3.Database
    });
 
  } catch (error) {
    console.error('Erro:', error.message);
  }

}

async function consumirAPI() {

  try {

    // Realizar a chamada na API
    const cont = {};
    const response = await fetch('https://randomuser.me/api/?results=150');
    
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    // Realizar a montagem das informações trazidas na const data
    const data = await response.json();
    const users = data.results;   

    const date_now = new Date();
    const data_process = users.map((user) => {

      // Tratamento para buscar a idade de acordo com a data de nascimento
      const date_age = new Date(user.dob.date);
      const age = date_now.getFullYear() - date_age.getFullYear();

      return {
        name: `${user.name.first} ${user.name.last}`,
        email: user.email,
        country: user.location.country,
        age
      };

    // Filtro para retornar apenas users com 18 ou mais
    }).filter((u) => u.age >= 18);  
       
    data_process.forEach((u) => { 
       
      cont[u.country] = (cont[u.country] || 0) + 1;

    });

    const db = await conectar();

    // criar a 
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users_random (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        country TEXT,
        age INTEGER
      )
    `);

    // Incluir informações dos usuários no banco de dados
    for (const d of data_process) {
      await db.run(`
        INSERT INTO users_random (name, email, country, age)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(email) DO UPDATE SET
          name = excluded.name,
          country = excluded.country,
          age = excluded.age
      `, [d.name, d.email, d.country, d.age]);
    }

    // Mostrar soma de paises apresentados na relação de usuários
    console.log('Contagem de Países: ', cont);

    // Buscar o total de arquivos registrados no banco de dados
    const total = await db.get('SELECT COUNT(*) AS total FROM users_random');
    console.log('Total de registros gravados: ', total.total);

    await db.close();

  } catch (error) {
    console.error('Erro:', error.message);
  }

}

consumirAPI();