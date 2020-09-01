import express from "express";
import path from "path";
import fs from "fs";
import axios from "axios";
import cheerio from "cheerio";
import https from "https";
var iconv = require("iconv-lite");
import moment from "moment";
import "moment/locale/pt-br";
moment.locale("pt-BR");
import { loadData, storeData } from "../../database/storage";

const router = express.Router();

const BASE_URL = "https://www.mg.gov.br";

const api = axios.create({
  // Configuration needed to avoid certificate problems
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
  // Convert it to UTF-8 later
  responseType: "arraybuffer",
  reponseEncoding: "binary",
});

api.interceptors.response.use((response) => {
  let ctype = response.headers["content-type"];
  if (ctype.includes("charset=ISO-8859-1")) {
    response.data = iconv.decode(response.data, "ISO-8859-1");
  }
  return response;
});

const logDate = `----- ${new Date()} -----\r\n`;
try {
  console.log("🤞 Scraping...", new Date());
  scrape();
  console.log("✌️ That's all folks");

  const successes = fs.readFileSync(
    path.join(__dirname, "../../logs/successes.log"),
    "utf8"
  );
  fs.writeFileSync(
    path.join(__dirname, "../../logs/successes.log"),
    successes + logDate + `Update success` + "\r\n\r\n"
  );
} catch (error) {
  const errors = fs.readFileSync(
    path.join(__dirname, "../../logs/errors.log"),
    "utf8"
  );
  fs.writeFileSync(
    path.join(__dirname, "../../logs/errors.log"),
    errors + logDate + error.message + "\r\n\r\n"
  );
}

async function scrape() {
  try {
    const url = `${BASE_URL}/servico/agendar-visitas-guiadas-na-biblioteca-publica-estadual-de-minas-gerais`;

    const responseAxios = await api.post(url);
    const $ = cheerio.load(responseAxios.data);
    const canais = [];
    let canal = {};
    const canais_prestacao = $(".canais_prestacao").each((index, element) => {
      let temp = cheerio
        .text($(element))
        .replace(/\s\s+/g, "###")
        .trim()
        .split("###");
      temp.shift();
      console.log(temp);
      temp.forEach((item, i) => {
        if (i % 2 === 0) {
          canal.titulo = item;
        } else if (i % 2 === 1) {
          canal.informacao = item;

          canais.push(canal);
          canal = {};
        }
      });
      // console.log(cheerio.text($(element)).replace(/\s\s+/g, " ").trim());
      console.log(canais);
    });

    // .replace(/\s\s+/g, " ")
    // .trim();

    const bot = {
      canais,
    };
    console.log(bot);
    storeData([...bot], path.join(__dirname, "../../database/data.json"));

    // console.log(bot);
    return bot;
  } catch (error) {
    console.log(`❌  ${error}`);
  }
}

module.exports = (app) => app.use("/api/bot", router);
