if (!process.env.OPEN_STATES_API_KEY) {
    require('dotenv').config();
}

const _ = require('lodash');
const OpenStates = require('openstates');
const express = require('express');
const Promise = require('promise');
const rp = require('request-promise');
const heroku = require("heroku-ping");

const apiKey = process.env.OPEN_STATES_API_KEY;
const openstates = new OpenStates(apiKey);

var app = express();
/* At the top, with other redirect methods before other routes */
app.use(function(req,res,next) {
    if(process.env.PORT && req.headers['x-forwarded-proto'] !== 'https') {
        //needed for heroku redirects
        res.redirect('https://informr.us'+req.url)
    } else {
        next()
    }
});
app.use(express.static('src'));
app.use(express.static('public'));

app.get('/', (req, res) => {
	res.render('index.html')
});

app.get('/geolookup/:lat/:lon', (req, res) => {
	const lat = req.params.lat;
	const lon = req.params.lon;

	const statesPromise = new Promise(function(resolve, reject) {
		openstates.geoLookup(lat, lon, function(err, res) {
			if (err) reject(err);
			else resolve(res);
		});
	});

	const congressUrl = `https://congress.api.sunlightfoundation.com/legislators/locate?latitude=${lat}&longitude=${lon}&apikey=${apiKey}`;
	const congressPromise = rp(congressUrl).then(body => JSON.parse(body).results);

	Promise.all([statesPromise, congressPromise])
		.then(results => res.send(_.flatten(results)))
		.catch(err => {
			throw err;
		})
});

app.listen(process.env.PORT || 3002, () => {
	console.log(`Server started at ${process.env.PORT || 3002}`);
});

//ONLY do this on prod
if (process.env.PORT) {
    heroku.ping({
      interval: 300000,     // milliseconds, defaults to 30 minutes
      silent: false,       // logging (default: false)
      apps: [{
        name: 'inform-r-us', // heroku app name - required
        secure: true      // requires https (defaults: false)
      }]
    });
}
