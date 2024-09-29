import telebot
from telebot import types

import requests
from bs4 import BeautifulSoup as bs

bot   = telebot.TeleBot('8082803883:AAFaFdPV46i8d4xUGdXOgxgKlfErSXSaJuk')

URL = 'https://www.vinted.pl/'
responce =  requests.get(URL).text

@bot.message_handler(commands=["start"])
def start(message):
    bot.send_message(message.chat.id, f'Приветсвую! \nТут ты сможешь приебрести свой стиль - а именно, ретро аксессуар.')

#@bot.message_handler(commands=["info"])
#def info(message):
 #   markup = types.InlineKeyboardMarkup()
  #  markup.add(types.InlineKeyboardButton('Vinted', url='https://www.vinted.pl/'))
   # bot.send_message(message.chat.id, f'')


bot.polling(none_stop=True)
