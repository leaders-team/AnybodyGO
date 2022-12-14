import { Injectable, OnModuleInit } from '@nestjs/common';
import { OpenaiService } from '../openai/openai.service';
import { POST_REQUESTS } from '../../config/api/routes';
import patterns from '../../config/bot/patterns';
import exceptions from '../../config/bot/exceptions';
import { HttpService } from "@nestjs/axios";
import { ParserService } from "../parser/parser.service";
import { locales } from "../../config/bot/locales";
const TelegramBot = require('node-telegram-bot-api');
import * as dayjs from 'dayjs';

@Injectable()
export class BotService implements OnModuleInit {
  private bot: any;

  constructor(
    private readonly parserService: ParserService,
    private readonly openaiService: OpenaiService,
    private readonly httpService: HttpService
  ) {
    this.bot = new TelegramBot(process.env.TOKEN, { polling: true });
  }

  onModuleInit() {
    this.botMessage();
  }

  botMessage() {
    this.bot.on('message', (message) => {
      const text = message.text.toString().toLowerCase();
      if (this.isValid(text)) {
        this.handleMessage(text, message);
      }
    });
  }

  hasPattern(text) {
    return patterns.some(pattern => text.includes(pattern));
  }

  hasException(text) {
    return exceptions.some(exception => text.includes(exception));
  }

  isValid(text) {
    return this.hasPattern(text) && !this.hasException(text);
  }

  handleMessage(message, meta) {
    console.log(meta);
    const date: string = dayjs().format('DD.MM.YYYY HH:mm');
    const prefix: string = `${meta.chat.title}\n${date}\n\n`
    this.openaiService.handleMessage(message, prefix).then((data) => {
      if (data.choices.length) {
        const text: string = data.choices[0].text;
        const parsedData: any = this.parserService.parseData(text);
        const preparedData: any = this.parserService.prepareDataToRequestObject(parsedData);
        if (parsedData) {
          preparedData.chatId = meta.chat.id;
          preparedData.chatName = meta.chat.title;
          preparedData.chatLink = `https://t.me/${meta.chat.username}`;
          preparedData.messageId = meta.message_id;
          preparedData.context = meta.text;
          preparedData.link = `${preparedData.chatLink}/${preparedData.messageId}`;
          this.pushData(preparedData)
            .then(({ data }) => {
              const link: string = data.link;
              const answer: string = `${locales.ru.replyMessage}\n`; // ru locale as default
              const options: any = {
                reply_to_message_id: meta.message_id,
                reply_markup: {
                  inline_keyboard: [[{
                    text: locales.ru.replyActionText,
                    switch_inline_query: locales.ru.replySwitch,
                    url: link
                  }]]
                }
              }
              this.bot.sendMessage(
                meta.chat.id,
                answer,
                options
              );
            })
            .catch((error) => {
              console.error(error); // smth happened with POST request
            })
        }
      }
    }).catch((error) => {
      console.error(error);
    });
  }

  pushData(data): Promise<any> {
    return this.httpService.axiosRef.post(POST_REQUESTS, data);
  }
}