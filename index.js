
// Import the postgres client
const { Client } = require("pg");
const express = require("express");
const axios = require('axios');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const url = require('url');

const app = express();
const PORT = process.env.PORT || 3000;


// Connect to our postgres database
// These values like `root` and `postgres` will be
// defined in our `docker-compose-yml` file
const client = new Client({
    host: 'dpg-cg79vao2qv28u2s3ss10-a',
    user: 'root',
    database: 'root_z3yt',
    password: 'BhO9CJ05X5uTv45OsuqLzo5n4t8pIhsA',
    port: 5432,
});


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


function calcularChecksum(datos) {
  const hash = crypto.createHash('sha256'); // Selecciona el algoritmo de hash, en este caso SHA-256
  hash.update(datos); // Ingresa los datos a ser hasheados
  const checksum = hash.digest('hex'); // Obtiene el resultado del hash en formato hexadecimal
  return checksum;
}


const execute = async (query) => {
  try {
      await client.connect();     // gets connection
      await client.query(query);  // sends queries
      return true;
  } catch (error) {
      console.error(error.stack);
      return false;
  } finally {
      await client.end();         // closes connection
  }
};

const text = `
CREATE TABLE IF NOT EXISTS REQUEST_ROUTE (
  id SERIAL PRIMARY KEY,
  username VARCHAR(80) NOT NULL,
  parameters VARCHAR(30) NOT NULL,
  shopping_centers VARCHAR(255) NOT NULL,
  roads VARCHAR(255) NOT NULL,
  result  INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
`;




app.get('/', async (req, res) => {
  const username = req.query.username || 'JhonssonC';
  try {
    const result = await axios.get(
      `https://api.github.com/users/${username}/repos`
    );
    const repos = result.data
      .map((repo) => ({
        name: repo.name,
        url: repo.html_url,
        description: repo.description,
        stars: repo.stargazers_count
      }))
      .sort((a, b) => b.stars - a.stars);

    res.send(repos);
  } catch (error) {
    res.status(400).send('Error while getting list of repositories');
  }
});




app.get('/api/v1/userchecksum', (req, res) => {

  const parsedUrl = url.parse(req.url, true);
  const query = parsedUrl.query;
  let usuario = query.user.toString();

  if(usuario.length>80){
    res.json({ error: 'Nombre muy extenso...' });
  }else{
    console.log('Usuario que ingresa para calcualar checksum: ',usuario);
    const checksumCalculado = calcularChecksum(usuario);
    res.json({ userChecksum: checksumCalculado });
  }
});



app.post('/api/v1/synchronous_shopping', (req, res) => {
  const { username, parameters, shoping_centers, roads, checksum } = req.body;

  console.log(username, parameters, shoping_centers, roads, checksum);

  const checksumRecibido = req.body.checksum;
  
  // Calcular el checksum de los datos recibidos
  const checksumCalculado = calcularChecksum('taximo_api_user'/*username*/);

  console.log(username);
  console.log(checksumCalculado);
  console.log(checksumRecibido);
  
  // Comparar el checksum recibido con el checksum calculado
  if (checksumRecibido === checksumCalculado) {
    // Los datos son válidos, continuar con la lógica de la aplicación
    // ...
    
    //res.json({ minimum_time: 30 }); // Envía el resultado en formato JSON
    res.json({ minimum_time: 30 });
  } else {
    // Los datos no son válidos, responder con un error
    res.status(400).send('Checksum no válido');
  }
  
  

});


  function handleStr(string){
      return string.replace(/^s+|s+$/g,"");
  }

// Manejador para la solicitud POST a la URL '/api/v1/synchronous_shopping'
function handlePostRequest(req, res) {
  const { username, parameters, shopping_centers, roads, checksum } = req.body;

  // Ejecuta una consulta SQL para insertar los datos en la tabla
  client.query(
    'INSERT INTO nombre_de_la_tabla (username, parameters, shopping_centers, roads, checksum) VALUES ($1, $2, $3, $4, $5)',
    [username, parameters, shopping_centers, roads, checksum],
    (error, result) => {
      if (error) {
        console.error(error);
        res.status(500).send('Error al insertar los datos en la base de datos');
      } else {
        res.json({ minimum_time: 30 });
      }
    }
  );
}




// Our app must connect to the database before it starts, so
// we wrap this in an IIFE (Google it) so that we can wait
// asynchronously for the database connection to establish before listening
(async () => {

  // execute(text).then(result => {
  //   if (result) {
  //       console.log('Tabla Creada');
  //   }else{
  //     console.log('No se creó la tabla');
  //   }
  // });

  app.listen(PORT, () => {
    console.log(`server started, listening on port ${PORT}`);
  });

})();