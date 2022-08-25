// // Conexion BD
//                     // nombre del módulo
// const express = require("express");
// const app = express();
// const port = 3000;

// app.listen(port, () => {
//     console.log("El servidor está inicializado en el puerto: ", port);
//    });

const child = require("child_process");
const fs = require("fs");

const LIMIT_INDEX = 1;
const LIMIT_COUNT = 3;
let count = 0;
let status = "";
let statusColor = "";
let number = 0;
let ip = "0.0.0.0";
let next = 0;
let arrayTodo = [];
let arrayNuevo = [];

const hosts = ["8.8.8.8"];

run();

function delay(timeout) {
    return new Promise((resolve) => setTimeout(resolve, timeout));
}
function getDate() {
    const date = new Date().toLocaleDateString("pt-PT", {
        timeZone: "America/Mexico_City",
    });
    return date.replaceAll("/", "-");
}

function getFile() {
    const date = getDate();
    let file = null;
    try {
        file = fs.readFileSync("logDelay.txt", "utf8");
    } catch {
        if (!fs.existsSync("logDelay.txt")) {
            fs.writeFileSync("logDelay.txt", ".");
            file = fs.readFileSync("logDelay.txt", "utf8");
        }
        if (!file) throw new Error("Error, not detect file logs");
    }
    return file;
}

function getLogsFile() {
    let fileData = getFile();
    if (fileData) fileData = fileData.split(", \r\n");
    else fileData = [];
    if (fileData.join(" ").length > 0 && fileData.join(" ").includes("\r"))
        fileData = fileData.join(" ").split("\r\n");
    else fileData = fileData.join(" ").split("\n");
    fileData = fileData.slice(1, fileData.length);
    return fileData.filter((x) => x !== undefined || !x);
}

function getNewLogs() {
    return arrayNuevo.filter((x) => x !== undefined || !x);
}

function run() {
    getFile();
    arrayTodo = [];
    arrayNuevo = [];
    // if (next >= hosts.length) return console.log("Programa finalizado");
    if (next >= hosts.length) {
        next = 0;
        return run();
    }
    getHost(hosts[next]);
}

function getHost(host) {
    const cmd = child.spawn("tracert", ["-d", host]);
    cmd.stdout.setEncoding("utf8");
    cmd.stderr.setEncoding("utf8");
    cmd.stdout.on("data", (data) => {
        if (data.includes("*") || data.includes("<1")) return;
        getLatency(data, host);
    });
    cmd.stderr.on("data", (data) => console.error("Error event", data));
    cmd.on("close", () => {
        const date = getDate();
        next++;
        console.log("");
        const newLogs = getNewLogs();
        const logsFile = getLogsFile();
        if (arrayTodo[0] !== "Fecha, MS, IP, status") arrayTodo.push("Fecha, MS, IP, status");
        arrayTodo.push(...[...logsFile, ...newLogs]);
        arrayTodo = arrayTodo.filter((x) => x !== undefined || !x);
        fs.writeFileSync("logDelay.txt", arrayTodo.join("\n"));
        run();
    });
}

let index = 0;
async function getLatency(data, host) {
    const dateAndTime = new Date().toLocaleString("pt-PT", {
        timeZone: "America/Mexico_City",
    });
    if (index === 0) {
        index = 1;
    } else {
        if (data.includes("ms")) {
            count = count + 1;
            number = number + parseFloat(data.trim().split(" ")[0]);
            if (data.trim().split(" ")[3]) ip = data.trim().split(" ")[3];
        }
        if (data.includes("Error") || data.includes("error")) {
            count = 4;
            number = 0;
            ip = host;
        }
        if (count >= LIMIT_COUNT) {
            if (number === 0) {
                statusColor = "\x1b[31m{message}\x1b[0m";
                status = "Conexion perdida";
                await delay(3000);
            } else if (number <= 100) {
                statusColor = "\x1b[32m{message}\x1b[0m";
                status = "Conexion con latencia estable";
            } else {
                statusColor = "\x1b[31m{message}\x1b[0m";
                status = "Conexion con latencia lenta";
            }
            arrayNuevo.push(`${dateAndTime} ${number} ${ip} ${status}`);
            console.log(
                `${dateAndTime} ${number} ms ${ip} - ${host} - ${statusColor.replace(
                    "{message}",
                    status
                )}`
            );
            index = LIMIT_INDEX;
            count = 0;
            number = 0;
        }
    }
}
