
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
    let time = undefined;
    try {
      const [n,m,k] = parameters.split(',').map(n=>parseInt(n));
      let centers = formatStringToArr(shoping_centers);
      let road = formatStringToArr(roads);
      console.log(n,m,k, centers, road);
      
      time = findShortestPath(n,m,k, centers, road);

      res.json({ minimum_time: time });// Envía el resultado en formato JSON

    } catch (error) {
      res.status(400).send('Formato de ingreso no valido');
    }
  } else {
    // Los datos no son válidos, responder con un error
    res.status(400).send('Checksum no válido');
  }
  
  

});

function formatStringToArr(str){
  return str.toString().split('-').map(v=>v.split(',').map(e=>parseInt(e)));
}


function handleStr(string){
    return string.replace(/^s+|s+$/g,"");
}

// Funcion para insertar datos
/*
const username = 'taximo_api_user';
const parameters = '5,5,5';
const shoping_centers = '1,1-1,2-1,3-1,4-1,5';
const roads = '1,2,10-1,3,10-2,4,10-3,5,10-4,5,10';
const checksum = 'cd7ced88fb72ee862940d5664555251f9ba044d8478a71a7b70b04bd708c2796';

insertarDatos(username, parameters, shoping_centers, roads, checksum, (error, result) => {
  if (error) {
    console.error(error);
  } else {
    console.log('Datos insertados correctamente');
  }
});
*/
function insertarDatos(username, parameters, shoping_centers, roads, checksum, callback) {
  pool.query('INSERT INTO nombre_de_la_tabla (parameters, shoping_centers, roads, checksum) VALUES ($1, $2, $3, $4)', 
  [parameters, shoping_centers, roads, checksum], (error, result) => {
    if (error) {
      console.error(error);
      callback(error, null);
    } else {
      callback(null, result);
    }
  });
}

// Función para consultar los datos de la tabla
/*
consultarDatos((error, data) => {
  if (error) {
    console.error(error);
  } else {
    console.log(data);
  }
});
*/
function consultarDatos(username, parameters, shoping_centers, roads, checksum, callback) {
  pool.query('SELECT * FROM nombre_de_la_tabla', (error, result) => {
    if (error) {
      console.error(error);
      callback(error, null);
    } else {
      callback(null, result.rows);
    }
  });
}



function findShortestPath(n, m, k, centers, roads) {
  //declaracion e inicializacion de variables

  // valor infinito para representar distancias desconocidas
  const INF = Number.MAX_SAFE_INTEGER;
  // inicializa la matriz graph con valores infinitos
  let graph = new Array(n).fill().map(() => new Array(n).fill(INF));
  // Inicializar como vacio el Arreglo de objetos con las rutas eficientes de cada punto hacia cada punto del Grafo
  let efiRouters = new Array(n).fill([]);
  //Variable acumuladora de Rutas Eficientes entre los dos intervinientes ()
  let accEfiRoutesDest = [];
  let typesFish = []; //tipos de pescados totales
  let optionsRoutes = []; //rutas donde existen tipos de pescados
  //se <<determina/reduce a>> la cantidad de opciones de rutas que se podrian seguir
  let countOptsRouters = 0;

  ///////////////////FUNCIONES DE AYUDA

  //Funcion para encontrar la ruta mas eficiente hacia cada punto de un grafo, tomando como referencia un punto inicial, retorna un areglo de distancias y un arreglo de paths o rutas (punto inmediato a destino)
  function dijkstra(globalGraph, start) {
    let graph = JSON.parse(JSON.stringify(globalGraph));
    const dist = new Array(graph.length).fill(INF);
    const visited = new Array(graph.length).fill(false);

    const path = new Array(graph.length).fill(null);

    dist[start] = 0;

    for (let i = 0; i < graph.length; i++) {
      let u = -1;
      for (let j = 0; j < graph.length; j++) {
        if (!visited[j] && (u === -1 || dist[j] < dist[u])) {
          u = j;
        }
      }

      visited[u] = true;

      for (let v = 0; v < graph.length; v++) {
        if (graph[u][v] !== Infinity) {
          const alt = dist[u] + graph[u][v];
          if (alt < dist[v]) {
            dist[v] = alt;
            path[v] = u;
          }
        }
      }
    }
    return { dist, path };
  }
  ///////////////////////////////////////////////////////////////////////////////////////////////////

  //Funcion reductora, recibe como parametro las rutas estimadas a tomar
  //(donde hayan tipos de pescados) de BC y LC ademas de una actualizacion de los tipos
  //comprados, y devuelve las rutas estimadas solo de los centros comerciales o pescaderias
  //donde hay los tipos de pescados que hace falta comprar.
  function reduceDest(routesBC, routesLC, typesShop) {
    const reductor = (route) => {
      let existTypes = route.types.filter((t) => {
        return !typesShop.includes(t);
      });
      return existTypes.length > 0;
    };

    let nrbc = routesBC.filter(reductor);
    let nrlc = routesLC.filter(reductor);

    //console.log('Nuevas Rutas ', nrbc, nrlc);

    return [nrbc, nrlc];
  }
  ////////////////////////////////////////////////////////////////////////////////////////////////

  //consolida 2 arreglos a uno solo, colabora en almacenar los tipos de pescados que faltan
  //para despues poder verificar cuales faltan, no duplica, recibe un arreglo con los
  //tipos de pescados comprados anteriormente, y los tipos que se compran en el centro
  //comercial actual. Devuelve un solso arreglo
  function consolideArr(arregloAgregado, arregloPrincipal) {
    arregloAgregado.forEach((valor) => {
      if (!arregloPrincipal.includes(valor)) {
        arregloPrincipal.push(valor);
      }
    });
    return arregloPrincipal;
  }
  /////////////////////////////////////////////////////////////////////////////////////////////

  //Funcion para llegar a punto final propuesto, retornando los puntos visitados

  function visitEndCente(
    start,
    efiRouters,
    centers,
    optionsRoutes,
    IdEndCenter,
    typesShop,
    cat
  ) {
    let visitorPath = [];
    let visitorTime = 0;
    let routeXc = optionsRoutes;

    console.log(
      'LLEGANDO AL FINAL PROPUESTO EN PRIMERA INSTANCIA',
      IdEndCenter
    );
    //extraemos la ruta y el path más eficientes hacia el ultimo punto
    let distanceTmpAct = efiRouters[start].dist[IdEndCenter];
    let pathTmpAct = efiRouters[start].path[IdEndCenter] + '';

    //se deja el path en formato entendible
    while (!(parseInt(pathTmpAct[0]) == start)) {
      pathTmpAct = efiRouters[start].path[parseInt(pathTmpAct[0])] + pathTmpAct;
    }
    pathTmpAct = pathTmpAct.substring(1) + IdEndCenter;

    //se recorre el path y
    pathTmpAct.split('').forEach((cter) => {
      const nCtr = parseInt(cter);
      //se agrega los tipos de pescado finales
      typesShop = consolideArr(centers[nCtr].slice(1), typesShop);
      //y se agrega al path de LC los centros de la ruta
      visitorPath.push(nCtr);

      //reestructuramos los destinos a razon de lo que se compra en este destino
      [routeXc, []] = reduceDest(routeXc, [], typesShop);
    });
    //log de prueba
    //console.log('+Comprados LC', typesShop);
    //se suma ell tiempo al tiempo del LC
    visitorTime += distanceTmpAct;
    //log de actualizacion de LC
    console.log(
      'TIEMPO Y PATHS HACIA EL FIN DE ' + cat + ' PROPUESTO: ',
      visitorTime,
      visitorPath
    );

    return [IdEndCenter, visitorTime, visitorPath, routeXc, typesShop];
  }

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  //Funcion para recorrer un arreglo de centros e irlo reduciendo hasta comprar todos los tipos de peces en los centros
  function visitedCentersCat(efiRouters, routeXc, typesShop, cat) {
    let visitorPath = [];
    let visitorTime = 0;
    let accSecurity = 0;
    let start = 0;
    let arrRouteTmp = routeXc.map((itm) => itm.id - 1);
    while (!(routeXc.length == 0 || accSecurity >= 1000)) {
      //acumulador de seguridad para asegurarse de que no se quede infinitamente
      accSecurity += 1;
      //Inicializacion de distancia inicial al punto
      let distanceTmpAct = Infinity;
      //id temporal de punto que podria estar activo y ser el punto de inicio en la siguiente iteraccion
      let idTmpAct = -1;
      //path de ruta hacie siguiente punto probable
      let pathTmpAct = '';

      //recorrer todas las rutas para encontrar la menor hacia un punto de las que debemos recorrer con BC
      //console.log('start: ', start);
      for (let rb = 0; rb < efiRouters[start].path.length; rb++) {
        //Distancia Actual
        let currDist = efiRouters[start].dist[rb];
        //si el tiempo minimo mayor a cero al proximo
        //menor tiempo al tiempo del punto anterior
        //punto donde hay tipo de pescados
        if (
          currDist > 0 &&
          currDist < distanceTmpAct &&
          arrRouteTmp.includes(rb)
        ) {
          //se almacenan las variables
          distanceTmpAct = currDist;
          idTmpAct = rb;
          pathTmpAct = efiRouters[start].path[rb].toString();

          //Detalle con el Path
          //mientras el path no este directamente conectado a el punto departida
          //lo vamos a buscar en el arreglo de paths
          //asi encontramos la traza de puntos con menos tiempo.
          while (!(parseInt(pathTmpAct[0]) == start)) {
            pathTmpAct =
              efiRouters[start].path[parseInt(pathTmpAct[0])] + pathTmpAct;
          }
          //siempre en estos casos en base al algoritmos tendremos como punto inical del path
          //el mismo punto actual, y no obtendremos el punto final en el path.
          //lo que se hace aqui es dejar el path con un formato entendible al humano
          //detallando el recorrido.
          pathTmpAct = pathTmpAct.substring(1) + rb;

          //log para verificacion
          /*
          console.log(
            'pathTmpAct, path temporal de la iteraccion: ',
            pathTmpAct
          );
          */
        }
        //log para verificacion de iteraccion
        /*
        //console.log('desde', start,'id',rb, 'distanciaGuardada',distanceTmpAct, 'finGuardado',idTmpAct, 'pathGua',pathTmpAct);
        */
      }
      ////////////al finalizar la iteraccion sobre las rutas de mejor tiempo, obtendremos la mejor
      //hacia un punto que tenga tipos de pescado que necesitemos comprar

      //si obtenemos un punto vamos a trabajarlo
      if (idTmpAct > -1) {
        //se itera el path puesto que podemos haber pasado varios puntos
        pathTmpAct.split('').forEach((cter) => {
          //almacena el punto id y lo convierte a entero
          const nCtr = parseInt(cter);
          //si hay pescados en este punto los agrega al arreglo de pescados comprados.
          typesShop = consolideArr(centers[nCtr].slice(1), typesShop);
          //reestructuramos los destinos a razon de lo que se compra en este destino
          [routeXc, []] = reduceDest(routeXc, [], typesShop);
          //extraemos los puntos a los que tenemos q ir (solo BC)
          arrRouteTmp = routeXc.map((itm) => itm.id - 1);
          //almacena el path
          visitorPath.push(nCtr);
        });
        //cambia al nuevo inicio, que será el punto al cual llegó
        start = JSON.parse(JSON.stringify(idTmpAct));
        //acumula el tiempo de llegada al punto
        visitorTime += distanceTmpAct;
        //Log para mostrar Tiempo y Path en consola
        console.log(
          'TIEMPO Y PATHS Gato ' + cat + ': ',
          visitorTime,
          visitorPath
        );
      }
      //termina si obtenemos un punto vamos a trabajarlo
    }
    return [start, visitorTime, visitorPath, routeXc, typesShop];
  }

  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////

  ///////////////////FIN FUNCIONES DE AYUDA

  //Se establece el Grafo a razon de una arreglo bidimensional
  for (let i = 0; i < m; i++) {
    // u y v son los índices de los centros comerciales, w es el tiempo que se tarda en llegar de u a v
    let [u, v, w] = roads[i];
    // establece el tiempo de la ruta en la matriz graph
    graph[u - 1][v - 1] = Math.min(graph[u - 1][v - 1], w);
    // como las rutas son bidireccionales, también se establece el tiempo en la dirección inversa
    graph[v - 1][u - 1] = Math.min(graph[v - 1][u - 1], w);
  }

  //consulta de tiempo eficiente de como llega cada punto a todos los demas
  for (let i = 0; i < n; i++) {
    efiRouters[i] = dijkstra(graph, i);
    //console.log('Rutas eficientes desde centro', i, efiRouters[i]);
  }

  //recorremos todos los centros
  for (let i = 0; i < n; i++) {
    //verificamos en cada centro si el primer valor asiciado a la cantidad de tipos de peces es mayor a cero
    if (centers[i][0] > 0) {
      //agregamos el centro a un arreglo de objetos con detalles del centro y tipos de pescado alli vendidos
      optionsRoutes.push({
        id: i + 1, //id de Centro
        count: centers[i][0], //cantidad de tipos de pescados
        types: centers[i].slice(1), //arreglo de tipos de pescados
      });
      typesFish = consolideArr(centers[i].slice(1), typesFish);
    }
  }

  //se <<determina/reduce a>> la cantidad de opciones de rutas que se podrian seguir
  countOptsRouters = optionsRoutes.length;

  //Se inicializa las variables
  let minTime = INF;
  let visitor1Path = [1];
  let visitor2Path = [1];
  let totalTime = 0;
  let visitor1Time = 0;
  let visitor2Time = 0;
  let typesShop = [];

  //Se establece un loop para encontrar las rutas entre los 2 Gatos hacia los centros
  //tomando como referencia los centros con tipos de pescados comprados.
  //empieza en 1 ya que en cada iteraccion este valor será el punto de llegada propuesto
  //a ambos gatos
  for (let i = 1; i < countOptsRouters; i++) {
    //Reinicializamos a Cero las Variables en cada Iteraccion
    visitor1Path = [0];
    visitor2Path = [0];
    totalTime = 0;
    visitor1Time = 0;
    visitor2Time = 0;
    typesShop = [];

    //Indica el inicio o punto de Partida/Step/Punto Actual de los Gatos (BC, LC)
    let start = 0;
    //Indica el punto propuesto de finalizacion de ambos gatos.
    let end = optionsRoutes[i].id - 1;
    //ruta de LC (arreglo de Rutas) de para comprar tipos de pescado
    let routeLC = optionsRoutes.slice(end + 1);

    //Log para identificar la ruta propuesta y cada iteraccion.
    console.log('----------------------------------------end: ', end);

    console.log(optionsRoutes, [], routeLC);

    //Reduccion inicial en base a los tipos comprados
    [[], routeLC] = reduceDest([], routeLC, typesShop);

    //reestructuramos los destinos a razon de lo que se compra en el primer destino
    //en el primer destino siempre estan y parten los 2 Gatos
    typesShop = consolideArr(centers[0].slice(1), typesShop);

    ///////////////////////////////////////////////////////////////////////////////////////////////////////
    //BC
    //recorrer todas las rutas posibles Rutas de compras de BC
    //Mientras haya centros que recorrer con tipos de pescado por comprar recorremos con BC

    [start, visitor1Time, visitor1Path, routeLC, typesShop] = visitEndCente(
      start,
      efiRouters,
      centers,
      optionsRoutes,
      end,
      typesShop,
      'BC'
    );

    //Terminamos el recorrido de  Mientras haya centros que recorrer con tipos de pescado por comprar BC
    ///////////////////////////////////////////////////////////////////////////////////FIN BC

    //el ultimo punto marcadocomo nuevo start, es el punto de finalizacion para LC
    end = JSON.parse(JSON.stringify(start));

    //El nuevo inicio de LC va a ser cero (0)
    start = 0;

    ///////////////////////////////////////////////////////////////////////////////////////////////////////
    //LC
    //recorrer todas las rutas posibles Rutas de compras de LC
    //Mientras haya centros que recorrer con tipos de pescado por comprar recorremos con BC

    [start, visitor2Time, visitor2Path, routeLC, typesShop] = visitedCentersCat(
      efiRouters,
      routeLC,
      typesShop,
      'LC'
    );

    ///////////////////////////////////////////////////////////////////////////////////FIN LC

    //Si el segundo gato no llego al final (propuesto por el primer gato)
    if (!(start == end || visitor2Time == 0)) {
      console.log('Hay que llegar al final propuesto por BC');

      //Declaracion e inicializacion de variables temporales
      let distanceTmpAct = 0;
      let completePath = [];
      let tmpRouter = [];

      //Se usa Funcion para llegar a punto propuesto
      [start, distanceTmpAct, completePath, tmpRouter, typesShop] =
        visitEndCente(
          start,
          efiRouters,
          centers,
          optionsRoutes,
          end,
          typesShop,
          'LC'
        );

      //Se agrega al path de LC los centros de la ruta encontrada
      visitor2Path = visitor2Path.concat(completePath);

      //se suma/acumula al tiempo del LC
      visitor2Time += distanceTmpAct;
    }
    //el tiempo empleado es el maximo de los dos BC - LC
    totalTime = Math.max(visitor1Time, visitor2Time);

    //log de actualizacion para comprobacion
    console.log(
      'TIEMPO Y PATHS FINALES DE ITERACCION END=' + end + ': ',
      'Tiempo total',
      totalTime,
      'Tiempo BC',
      visitor1Time,
      'Path BC',
      visitor1Path,
      'Tiempo LC',
      visitor2Time,
      'Path LC',
      visitor2Path
    );

    //Se añade los resultados relevantes a un arreglo de objetos
    accEfiRoutesDest.push({
      totalTime,
      visitor1Time,
      visitor1Path,
      visitor2Time,
      visitor2Path,
    });
  }

  //Se presenta por consola
  console.log(accEfiRoutesDest);

  //Obtenemos el minimo tiempo de recorrido entre todas las rutas analizadas encontrados
  minTime = Math.min(...accEfiRoutesDest.map((r) => r.totalTime));

  //Se retorna el minimo.
  return minTime;
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