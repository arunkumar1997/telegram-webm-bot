const { Telegraf } = require('telegraf')
const express = require('express')
require('dotenv').config()
const fs = require('fs');
const Path = require('path')
const FILE_PATH = Path.resolve(__dirname, 'tmp')
const util = require('node:util');
const execFile = util.promisify(require('node:child_process').execFile);
const MAX_FILE_SIZE = 6 * 100 * 1024 // 600Kb
const bot = new Telegraf(process.env.BOT_TOKEN)

const app = express()
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Check me at t.me/dnof3f81f3dBot.')
})

app.listen(port, '0.0.0.0', () => {
    console.log('Server is running s on port: ' + port)
});

bot.start((ctx) => {
    let message = `Please upload GIF or video files to get the webm file\nMax file size 600kb`
    ctx.reply(message, { reply_to_message_id: ctx.message.message_id })
})

bot.on('message', async(ctx) => {
    try {
        if (ctx.update && ctx.update.message) {
            let memeType, fileExtention, fileId, fileSize
            if (ctx.update.message.document) {
                [memeType, fileExtention, fileSize] = getFileFormate(ctx.update.message.document)
                fileId = ctx.update.message.document.file_id

            }
            if (ctx.update.message.video) {
                [memeType, fileExtention, fileSize] = getFileFormate(ctx.update.message.video)
                fileId = ctx.update.message.video.file_id

            }
            if (ctx.update.message.animation) {
                [memeType, fileExtention, fileSize] = getFileFormate(ctx.update.message.animation)
                fileId = ctx.update.message.animation.file_id

            }
            if (fileSize > MAX_FILE_SIZE) {
                return ctx.reply(`File size is too large, max file size is 255kb`, { reply_to_message_id: ctx.message.message_id })
            }

            if (memeType != 'image' && memeType != 'video') {
                return ctx.reply(`Unsupported file format\n/start to get started`, { reply_to_message_id: ctx.message.message_id })
            }

            ctx.reply(`Processing your file...`, { reply_to_message_id: ctx.message.message_id })
            const fileLink = await getFileLink(fileId)
            const filePathLocal = `${FILE_PATH}/${fileId}.${fileExtention}`

            // download file from url
            await execFile('wget', ['-O', `${filePathLocal}`, `${fileLink}`])

            // convert file to webm
            const cmd = ["-i", `${filePathLocal}`, "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-s", "512x512", `${FILE_PATH}/${fileId}.webm`]
            const { stdout, stderr } = await execFile('ffmpeg', cmd)

            // telegram bot replayWithVideoß
            ctx.replyWithDocument({ source: `${FILE_PATH}/${fileId}.webm` }, { filename: `${fileId}.webm`, caption: 'Here is your webm file', reply_to_message_id: ctx.message.message_id, chat_id: ctx.message.chat.id }).then(() => deleteFiles(fileId, fileExtention))

        } else {
            ctx.reply('Unsupported file type!!\n/strat to get started', { reply_to_message_id: ctx.message.message_id })
            deleteFiles(fileId, fileExtention)
        }
    } catch (error) {
        console.log("error", error)
        execFile('rm', ['-rf', `${FILE_PATH}/*`])
    }

})


bot.launch()
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));


async function getFileLink(fileId) {
    const link = await bot.telegram.getFileLink(fileId)
    return link.href
}

function getFileFormate(attachment) {
    const formate = attachment.mime_type.split('/')
    return [...formate, attachment.file_size]
}

function deleteFiles(fileId, fileExtention) {
    try {
        execFile('rm', ['-rf', `${FILE_PATH}/${fileId}.webm`, `${FILE_PATH}/${fileId}.${fileExtention}`])
    } catch (error) {
        console.log("error", error)
    }
}