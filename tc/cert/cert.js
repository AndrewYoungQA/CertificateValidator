const https = require('https');
const { expect } = require('testcafe');
const dataSet = require('../data/certData.json');

const basicAuth = {
    username: process.env.USERNAME,
    password: process.env.PASSWORD,
};

for (const data of dataSet) {
    fixture`${data.app} : ${data.env} - Certificate Test`
        .page(data.url);

    test.meta('env', data.env)(`${data.url}`, async t => {
        let validFromDate;
        let validToDate;
        let issuer;
        let fingerprint256;

        console.log(`App: ${data.app}`);
        console.log(`ENV: ${data.env}`);
        console.log(`URL: ${data.url}`);
        console.log(`Owner: ${data.owner}`);
        console.log(`Server: ${data.server}`);

        await new Promise((resolve, reject) => {
            const options = {
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(basicAuth.username + ':' + basicAuth.password).toString('base64')
                }
            };

            https.get(data.url, options, (res) => {
                const cert = res.connection.getPeerCertificate();
                if (!cert || Object.keys(cert).length === 0) {
                    return reject(new Error("No certificate found or incomplete certificate details."));
                }

                issuer = cert.issuer.O;
                validFromDate = new Date(cert.valid_from);
                validToDate = new Date(cert.valid_to);
                fingerprint256 = cert.fingerprint256;

                resolve();
            }).on('error', (err) => {
                console.log('Error: ', err);
                reject(err);
            });
        });

        // Format validFromDate and validToDate as "YYYY-MM-DDTHH:mm:ssZ"
        const formattedValidFromDate = formatDate(validFromDate);
        const formattedValidToDate = formatDate(validToDate);

        console.log(`Issuer: ${issuer}`);
        console.log(`Valid from: ${formattedValidFromDate}`);
        console.log(`Valid to: ${formattedValidToDate}`);
        

        // Assert issuer is the expected value
        const expectedIssuer = 'GoDaddy.com, Inc.';
        await t.expect(issuer).eql(expectedIssuer, 'Certificate issuer is not the expected value.');

        // Assert valid from date
        const expectedValidFromDate = new Date('2023-06-27T17:11:10Z').getTime();
        await t.expect(validFromDate.getTime()).eql(expectedValidFromDate, 'Certificate valid from date does not match expected date.');

        // Assert valid to date
        const expectedValidToDate = new Date('2024-06-27T17:11:10Z').getTime();
        await t.expect(validToDate.getTime()).eql(expectedValidToDate, 'Certificate valid to date does not match expected date.');

        // Normalize the fingerprint to upper case and remove colons
        const normalizedFingerprint = fingerprint256.replace(/:/g, '').toUpperCase();
        const expectedFingerprint256 = '4F97FA0B7124CDCE966BAD3875990E56566388EDF27677866CA4E02B8BF3251D';
        console.log(`SHA-256 Fingerprint: ${normalizedFingerprint}`);
        await t.expect(normalizedFingerprint).eql(expectedFingerprint256, 'SHA-256 Fingerprint does not match the expected value.');

    });

    function formatDate(date) {
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        const seconds = String(date.getUTCSeconds()).padStart(2, '0');

        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;
    }
}
