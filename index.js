const axios = require('axios');
const cheerio = require('cheerio');
const bluebird = require('bluebird');
const mongoose = require('mongoose');

let Link = require('./link.model');
let Queue = require('./Queue');

let activeRequests = 0;
let startUrl = `https://www.medium.com`;

let maxRequest = 5;

setUpMongo();

let queue = new Queue();
queue.enqueue(startUrl);
makeRequest();

async function makeRequest() {
    try {
        if (activeRequests < maxRequest && !queue.isEmpty()) {
            activeRequests++;
            let response = await axios.get(queue.dequeue());
            let result = await handleResponse(response);
            activeRequests--;
        }

        setTimeout(() => {
            makeRequest();
        }, 0);
    } catch (err) {
        console.log(err);
    }
}

async function handleResponse(res) {
    let $ = cheerio.load(res.data);
    let links = $.root().find('a');
    console.log(links[0], links[1]);
    $(links).each(async (i, link) => {
        link = mediumRelativeUrl($(link).prop('href'));
        console.log(link);
        if (link && link.includes(startUrl)) {
            queue.enqueue(link);
            let data = link.split('?');
            let url = data[0];
            let params = [];
            if (data[1] && (data[1].length !== 0)) {
                params = data[1].split('&');
                params = params.map(param => {return param.split('=')[0]});
            }

            let update = await Link.update({url},{$set: {url}, $inc: {refCount: 1}, $addToSet: {params: {$each: params}}}, {upsert: true});
        }

    });
}

function mediumRelativeUrl(url) {
    if (typeof url === 'string') {
        if (url.substring(0, 4) === 'http') {
            return url;
        } else {
            let rg = new RegExp('^\\/ * ? ');
            return `${startUrl}${url.replace(rg, "/")}`;
        }
    }

    return null;
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

