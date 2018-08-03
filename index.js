const request = require('request');
const cheerio = require('cheerio');
const bluebird = require('bluebird');
const mongoose = require('mongoose');

let Link = require('./link.model');
let Queue = require('./Queue');

let maxRequest = 5;
let activeRequests = 0;
let startUrl = `https://medium.com`;

setUpMongo();

let urlSet = new Set();
let queue = new Queue();
queue.enqueue(startUrl);
makeRequest();

function makeRequest() {
    try {
        if (activeRequests < maxRequest && !queue.isEmpty()) {
            activeRequests++;
            let url = queue.dequeue();

            request(url, (err, response, body) => {
                activeRequests--;
                if (err) {
                    console.log(`err ${err}`);
                    throw new Error(err);
                }
                handleResponse(body);
            });
        }

        setTimeout(() => {
            makeRequest();
        }, 0)
    } catch (err) {
        makeRequest();
    }
}

function handleResponse(res) {
    let $ = cheerio.load(res);
    let links = $('a');
    $(links).each((i, link) => {
        link = $(link).attr('href');
        if (link && link.includes(startUrl)) {
            queue.enqueue(link);
            saveToDb(link);
        }
    });
}

function saveToDb(link) {
    let data = link.split('?');
    let url = data[0];

    let params = [];
    if (data[1] && (data[1].length !== 0)) {
        params = data[1].split('&').map(param => {return param.split('=')[0]});
    }

    if (urlSet.has(url)) {
        Link.update({url},{$inc: {refCount: 1}, $addToSet: {params: {$each: params}}});
    } else {
        urlSet.add(url);
        Link.create({url, params});
    }
}

function setUpMongo() {
    mongoose.Promise = bluebird;
    let mongoOptions = {
        useNewUrlParser: true
    };
    mongoose.connect(`mongodb://127.0.0.1:27017/medium_scrap`, mongoOptions);

    mongoose.connection.on('error', (err) => {
        console.error(`Mongodb connection error ${err}`);
        process.exit(-1);
    });
}

