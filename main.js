const { Client, LocalAuth } = require('./index');
const xlsx = require('xlsx');
const fs = require('fs');
const readline = require('readline');

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const readData = (filePath) => {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);
    const phoneNumbers = data
        .map(row => `57${row['WhatsApp'].toString()}`);
    const message = fs.readFileSync('mensaje.txt', 'utf8').trim();
    return { phoneNumbers, message };
};


const client = new Client({
    authStrategy: new LocalAuth(),
    // proxyAuthentication: { username: 'username', password: 'password' },
    puppeteer: {
        // args: ['--proxy-server=proxy-server-that-requires-authentication.example.com'],
        headless: false,
    }
});

// client initialize does not finish at ready now.
client.initialize();

client.on('loading_screen', (percent, message) => {
    console.log('LOADING SCREEN', percent, message);
});

// Pairing code only needs to be requested once
let pairingCodeRequested = false;
client.on('qr', async (qr) => {
    // NOTE: This event will not be fired if a session is specified.
    console.log('QR RECEIVED', qr);

    // paiuting code example
    const pairingCodeEnabled = false;
    if (pairingCodeEnabled && !pairingCodeRequested) {
        const pairingCode = await client.requestPairingCode('3163803440'); // enter the target phone number
        console.log('Pairing code enabled, code: ' + pairingCode);
        pairingCodeRequested = true;
    }
});

client.on('authenticated', () => {
    console.log('AUTHENTICATED');
});

client.on('auth_failure', msg => {
    // Fired if session restore was unsuccessful
    console.error('AUTHENTICATION FAILURE', msg);
});

client.on('ready', async () => {
    console.log('READY');
    const debugWWebVersion = await client.getWWebVersion();
    console.log(`WWebVersion = ${debugWWebVersion}`);

    client.pupPage.on('pageerror', function (err) {
        console.log('Page error: ' + err.toString());
    });
    client.pupPage.on('error', function (err) {
        console.log('Page error: ' + err.toString());
    });


    const askFilePath = () => {
        return new Promise(resolve => {
            rl.question('Ingrese la ruta del archivo Excel: ', answer => {
                // rl.close();
                resolve(answer.trim());
            });
        });
    };

    const filePath = await askFilePath();
    if (!filePath) {
        console.error('Debe ingresar un archivo.');
        process.exit(1);
    }

    const { phoneNumbers, message } = readData(filePath);
    console.log(`Se enviará el mensaje a ${phoneNumbers.length} telefonos.`);
    console.log('Se va a enviar el mensaje:\n', message);

    const enterToSend = () => {
        return new Promise(resolve => {
            rl.question('Presione "ENTER" para realizar el envio:', () => {
                rl.close();
                resolve();
            });
        });
    };

    await enterToSend();
    await sendMultitpleMessages(phoneNumbers, message);

    await client.destroy();
    // 

});

async function sendMultitpleMessages(phones, message) {

    for (const num of phones) {
        console.log(`Enviando a ${num}`);
        const id = await client.getNumberId(num.toString());
        console.log(id);
        const chat = await client.getChatById(id._serialized);
        await chat.sendMessage(message);
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}

client.on('disconnected', async (reason) => {
    console.log(`Client disconnected - Reason: ${reason}`);
});
