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

    const data_process = users.map((user) => ({
      name: `${user.name.first} ${user.name.last}`,
      email: user.email,
      country: user.location.country,
    }));  
    
    data_process.forEach((u) => {  
      cont[u.country] = (cont[u.country] || 0) + 1;
    });

    // Mostrar soma de paises apresentados na relação de usuários
    console.log('Contagem de Países: ', cont);

  } catch (error) {
    console.error('Erro:', error.message);
  }

}

consumirAPI();