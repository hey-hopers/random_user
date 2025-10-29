import fs from 'fs';
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

  // Iniciar log
  const date_now = new Date();
  const log = {
    total: 0,
    add: 0,
    update: 0,
    ignore: 0,
    error: []
  };

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

    log.total = users.length;

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
       
    // Incluir em logs os registros ignorados
    log.ignore = users.length - data_process.length;

    data_process.forEach((u) => { 
       
      cont[u.country] = (cont[u.country] || 0) + 1;

    });

    const db = await conectar();

    // Criar a tabela caso ela não exista
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users_random (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        country TEXT,
        age INTEGER
      )
    `);

    // Incluir ou alterar informações dos usuários no banco de dados
    for (const d of data_process) {

      try {

        const email = d.email.trim().toLowerCase();
        const select = await db.get(`SELECT * FROM users_random WHERE email = ?`, [email]);

        if (select) {
          await db.run(`UPDATE users_random SET name=?, country=?, age=? WHERE email=?`, 
            [d.name, d.country, d.age, d.email]);
          log.update += 1;

        } else {
          await db.run(`INSERT INTO users_random (name,email,country,age) VALUES (?,?,?,?)`,
            [d.name, d.email, d.country, d.age]);
          log.add += 1;

        }

      } catch (err) {
        log.error.push({ email: d.email, mensagem: err.message });

      }

    }

    // Mostrar soma de paises apresentados na relação de usuários
    console.log('Contagem de Países: ', cont);

    // Buscar o total de arquivos registrados no banco de dados
    const total = await db.get('SELECT COUNT(*) AS total FROM users_random');
    console.log('Total de registros gravados: ', total.total);

    await db.close();

    // Nome do arquivo de relatório com data/hora
    const timestamp = date_now.toISOString().split('T')[0];
    const log_path = `logs/${timestamp}.txt`;

    // Gerar conteudo do arquivo de log e gravar
    const text_log = `
      LOG ${new Date().toLocaleString()}
      
      Adicionados: ${log.add} - Atualizados: ${log.update} - Ignorados: ${log.ignore}
      Com Erros: ${log.error.map(e => `- ${e.email}: ${e.mensagem}`).join('\n')}
      Total de registros gravados: ${log.total}
      Total de registros no banco atualmente: ${total.total}
      `;

    fs.appendFileSync(log_path, text_log.trim()  + '\n');

  } catch (error) {
    // Incluir em logs os registros com erro
    log.error.push(`mensagem: ${error.message}`);
    console.error('Erro:', error.message);
  }

}

consumirAPI();