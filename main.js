const { Client, LocalAuth } = require('./index');
const xlsx = require('xlsx');
const fs = require('fs');
const readline = require('readline');

const blue = '\x1b[34m';
const reset = '\x1b[0m';
const red = '\x1b[31m';

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

    const baseMessage = fs.readFileSync('mensaje.txt', 'utf8').trim();

    const recipientData = data.map(row => {
        const phoneNumber = `57${row['WhatsApp'].toString()}`;

        // Replace parameters in the message
        let filledMessage = baseMessage;
        const parameterRegex = /%([a-zA-Z0-9_]+)/g;
        filledMessage = filledMessage.replace(parameterRegex, (match, paramName) => {
            return row[paramName] !== undefined ? row[paramName].toString() : match;
        });

        return { phoneNumber, filledMessage };
    });

    return { baseMessage, recipientData };
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

    const { baseMessage, recipientData } = readData(filePath);
    console.log(`Se enviará el mensaje a ${recipientData.length} telefonos.`);

    const indent = '    ';

    const indentedMessage = baseMessage.split('\n').map(line => indent + line).join('\n');
    console.log('Se va a enviar el mensaje de base:');
    console.log(`${blue}${indentedMessage}${reset}`);

    const enterToSend = () => {
        return new Promise(resolve => {
            rl.question('Presione "ENTER" para realizar el envio:', () => {
                rl.close();
                resolve();
            });
        });
    };

    await enterToSend();
    await sendMultitpleMessages(recipientData);

    await client.destroy();
    // 

});

async function sendMultitpleMessages(recipients) {
    const failedNumbersFile = 'numeros_fallidos.csv';
    if (!fs.existsSync(failedNumbersFile)) {
        fs.writeFileSync(failedNumbersFile, 'Numero\n');
    }

    for (const { phoneNumber, filledMessage } of recipients) {
        const id = await client.getNumberId(phoneNumber.toString());
        if (!id) {
            console.log(`${red}No se pudo obtener el ID para ${phoneNumber}.${reset}`);
            // Save the phone number to a CSV file as a new line
            fs.appendFileSync('numeros_fallidos.csv', `${phoneNumber}\n`);
            continue;
        }

        console.log(`Enviando a ${phoneNumber} (${id._serialized})`);
        const chat = await client.getChatById(id._serialized);
        await chat.sendMessage(filledMessage);
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}

client.on('disconnected', async (reason) => {
    console.log(`Client disconnected - Reason: ${reason}`);
});
