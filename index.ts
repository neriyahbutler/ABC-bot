import DiscordJS, { Intents, Message, TextChannel, GuildMember, MessageEmbed, MessageActionRow, MessageButton, Guild } from 'discord.js'
import { joinVoiceChannel, getVoiceConnection } from '@discordjs/voice'
import { addSpeechEvent } from 'discord-speech-recognition'
const { Player, QueryType, QueueRepeatMode } = require('discord-player')

import dotenv from 'dotenv'
import { PlayerError, Queue, Track } from 'discord-player'
dotenv.config()

let channel: DiscordJS.DMChannel | DiscordJS.PartialDMChannel | DiscordJS.TextChannel | DiscordJS.NewsChannel | DiscordJS.ThreadChannel | null = null;

const server = new Map() 

const client = new DiscordJS.Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_VOICE_STATES,
    ],
})

addSpeechEvent(client)

client.on('ready', () => {
    console.log('The bot is ready!')
})

const player = new Player(client, {
    ytdlOptions: {
        quality: 'highestaudio',
        highWaterMark: 1 << 25
    }
})

client.on('messageCreate', async (msg) => {
    const vcChannel = msg.member?.voice.channel

    if (msg.content.toLowerCase() === '!join abc') {
        if (vcChannel == null) {
            await msg.reply('You must be in a voice channel to use ABC Bot')
        }
        else {
            await msg.reply('ABC Bot is deployed!')

            const guildKey = msg.guild?.id
            connect(msg, guildKey)
        }
    } else if (msg.content.toLowerCase() === '!leave abc') {
        const guildKey = msg.guild?.id
        if (guildKey) {
            const connection = getVoiceConnection(guildKey)
            connection?.destroy()
        }
    }
})


client.on("speech", (msg) => {
    try {
        const guildKey = msg.guild?.id
        const val = server.get(guildKey)
    
        const channel = client.channels.cache.get(val.textChannel.id)
    
        if (channel) {
            const msg_input = msg
            if (msg.content.toLowerCase().split(" ")[0] == 'abc') {
                console.log("User said", msg.content)
                if (msg.content.toLowerCase().split(" ")[1] == 'play') {
                    execute_play(msg_input)
                }
                if (msg.content.toLowerCase().split(" ")[1] == 'leave') {
                    execute_stop(msg_input)
                }
                if (msg.content.toLowerCase().split(" ")[1] == 'stop') {
                    execute_pause(msg_input)
                }
                if (msg.content.toLowerCase().split(" ")[1] == 'resume') {
                    execute_resume(msg_input)
                }
                if (msg.content.toLowerCase().split(" ")[1] == 'q') {
                    console.log("Showing queue")
                    execute_showqueue(msg_input)
                }
                if (msg.content.toLowerCase().split(" ")[1] == 'volume') {
                    const volume_input = (msg.content.split(" ")[2] as number)
                    console.log('Changing volume')
                    execute_setvolume(msg_input, volume_input)
                }
                if (msg.content.toLowerCase().split(" ")[1] == 'skip') {
                    execute_skip(msg_input)
                }
                if (msg.content.toLowerCase().split(" ")[1] == 'clear') {
                    execute_clear(msg_input)
                }
                if (msg.content.toLowerCase().split(" ")[1] == 'help') {
                    execute_commandlist(msg_input)
                }
            } else {
                // (channel as TextChannel).send(msg.content.toLowerCase())
            }
        }
    } catch(err) {
        console.log(err)
        console.log("THE ERROR GENERATING INPUT WAS:", msg.content)
    }
})

player.on('trackStart', (queue: Queue, track: Track) => {
    execute_nowplaying(queue.guild)
})

async function connect(msg: any, serverKey: any) {
    const voiceChannel = await msg.member?.voice.channel
    if (voiceChannel) {
        joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            selfDeaf: false,
        });

        try {
            let textChannel = await client.channels.fetch(msg.channel.id)

            server.set(serverKey, {
                'voiceChannel': voiceChannel,
                'textChannel': textChannel,
            })

            console.log(server)
        } catch (err) {
            console.log(err)
        }
    }
}


async function execute_play(msg: any) {
    try {
        const guildKey = msg.guild?.id
        const val = server.get(guildKey)
        const channel = (client.channels.cache.get(val.textChannel.id) as TextChannel)

        if (true) {
            const args1 = msg.content.toLowerCase()
            const args2 = (args1.split('abc play')[1])
            console.log("User said", msg.content);
            // const args = msg.content.toLowerCase().split('abc play ')[1]
            // (channel as TextChannel).send(msg.content)

            const res = await player.search(args2, {
                requestedBy: msg.member,
                serachEngine: QueryType.AUTO
            });

            if (!res || !res.tracks.length) return msg.channel.send(`No results found ${msg.author.username}, please try again!`)

            const queue = await player.createQueue(msg.guild, {
                metadata: msg.channel
            })

            try {
                if (!queue.connection) await queue.connect(msg.member.voice.channel)
            } catch {
                await player.deleteQueue(msg.guild.id)
                return msg.channel.send(`Can't join VC, please try again ${msg.author.usernam}`)
            }

            // if (channel){
            //     await channel.send(`Loading track queued by ${msg.author.username}`)
            // }

            res.playlist ? queue.addTracks(res.tracks) : queue.addTrack(res.tracks[0])

            if (!queue.playing) await queue.play();
        }
    } catch(err) {
        console.log(err)
    }
}

async function execute_stop(msg: any) {
    try {
        const queue = player.getQueue(msg.guild?.id)
        queue.stop()
    } catch (err) {
        console.log(err)
    }
}

async function execute_pause(msg: any) {
    try {
        const queue = player.getQueue(msg.guild?.id)
        queue.setPaused(true)
    } catch (err) {
        console.log(err)
    }
}

async function execute_resume(msg: any) {
    try {
        const queue = player.getQueue(msg.guild?.id)
        queue.setPaused(false)
    } catch (err) {
        console.log(err)
    }
}

async function execute_nowplaying(guild: Guild) {
    const queue = player.getQueue(guild.id)
    const guildKey = guild?.id
    
    console.log(`The guild key is ${guildKey} when showing 'Now Playing'`)

    const val = server.get(guildKey)
    const channel = (client.channels.cache.get(val.textChannel.id) as TextChannel)

    if (!queue || !queue.playing) return channel.send(`No music currently playing`)

    const track = queue.current;
    const embed = new MessageEmbed();

    embed.setColor('RED');
    embed.setThumbnail(track.thumbnail);
    embed.setAuthor(track.title, client.user?.displayAvatarURL({size:1024, dynamic: true}))

    const methods = ['disabled', 'track', 'queue'];

    const timestamp = queue.getPlayerTimestamp();
    const trackDuration = timestamp.progress == 'Infinity' ? 'infinity (live)' : track.duration;

    embed.setDescription(`Volume: **${queue.volume}**%\nDuration: **${trackDuration}**\nLoop mode: **${methods[queue.repeatMode]}**\nRequest by: ${track.requestedBy}`)
    embed.setTimestamp();

    channel.send({embeds: [embed]})
}

async function execute_showqueue(msg:any) {
    try {
        const queue = player.getQueue(msg.guild?.id)
        const val = server.get(msg.guild?.id)
        const textChannel = val.textChannel

        if (!queue) {
            const embed = new MessageEmbed()
            embed.setColor('RED')
            embed.setThumbnail(queue.current.thumbnail)
            embed.setAuthor('ABC Bot', client.user?.displayAvatarURL({size:1024, dynamic: true}))

            embed.setDescription('There is currently no music playing')
            return textChannel.send({embeds: [embed]})
        }

        if (!queue.tracks[0]) {
            const embed = new MessageEmbed()
            embed.setColor('RED')
            embed.setThumbnail(queue.current.thumbnail)
            embed.setAuthor('ABC Bot', client.user?.displayAvatarURL({size:1024, dynamic: true}))

            embed.setDescription('After the current song ends, no more songs will play')
            return textChannel.send({embeds: [embed]})
        }

        const embed = new MessageEmbed()
        embed.setColor('RED')
        embed.setThumbnail(queue.current.thumbnail)
        embed.setAuthor('ABC Bot', client.user?.displayAvatarURL({size:1024, dynamic: true}))

        const tracks = queue.tracks.map((track: Track, i: number) => `**${i + 1}** - ${track.title}\t**${track.duration}**`)
        const date = new Date(queue.totalTime)

        const tempProgressBar = queue.createProgressBar().split(" ")

        const currentTimeStamp = tempProgressBar[tempProgressBar.length - 1]
        let currentDate = currentTimeStamp.split(":")

        currentDate[0] = (currentDate[0] as number)
        currentDate[1] = (currentDate[1] as number)

        currentDate[0] = parseInt(currentDate[0]) + date.getMinutes()
        currentDate[1] = parseInt(currentDate[1]) + date.getSeconds()

        currentDate[0] += Math.floor(currentDate[1] / 60)
        currentDate[1] = currentDate[1] % 60
        
        embed.setDescription(`**Currently playing**\n${queue.current.title}\t**${currentTimeStamp} left**\n\n**Up Next**\n${tracks.join('\n')}\n\n**Total queue time:**\t**${currentDate[0]}:${currentDate[1]}**`)

        textChannel.send({embeds: [embed]})
    } catch(err) {
        console.log(err)
    }
}

async function execute_setvolume(msg:any, volume_input:any) {
    try {

        const queue = player.getQueue(msg.guild?.id)
        const val = server.get(msg.guild?.id)
        const textChannel = (client.channels.cache.get(val.textChannel.id) as TextChannel)

        const embed = new MessageEmbed()
        embed.setColor('RED')
        embed.setAuthor('ABC Bot', client.user?.displayAvatarURL({size:1024, dynamic:true}))

        if (volume_input >= 0 && volume_input <= 100)
        {
            queue.setVolume(volume_input)
            embed.setDescription(`Music player volume set to ${queue.volume}`)
        } else if (volume_input < 0) {
            embed.setDescription(`The music player volume must be above or equal to 0`)
        } else {
            embed.setDescription(`The music player volume must be below or equal to 100`)
        }
        
        textChannel.send({embeds: [embed]})
    } catch (err) {
        console.log(err)
    }
}

async function execute_skip(msg: any) {
    const queue = player.getQueue(msg.guild?.id)
    queue.skip()
}

async function execute_clear(msg: any) {
    const queue = player.getQueue(msg.guild?.id)
    queue.clear()
}

async function execute_commandlist(msg: any) {
    try {
        const val = server.get(msg.guild?.id)
        const textChannel = (client.channels.cache.get(val.textChannel.id) as TextChannel)
    
        const embed = new MessageEmbed();
    
        embed.setColor('RED')
        embed.setAuthor('Voice Channel Commmands', client.user?.displayAvatarURL({size:1024, dynamic:true}))
        embed.setDescription(`**Play command**\nAdds song to queue\nExample: *"abc play <song-title/video-title>"*\n
        **Stop command**\nStops song currently playing\nExample: *"abc stop"*\n
        **Leave command**\nMakes ABC bot leave voice channel\nExample: *"abc leave"*\n
        **Resume command**\nResumes current song in queue\nExample: *"abc resume"*\n
        **Queue command**\nShows queue for the channel\nExample: *"abc queue"*\n
        **Volume command**\nChanges the bot's volume\nExample: *"abc volume <volume-level>"*\n
        **Skip command**\nSkips the current song in queue\nExample: *"abc skip"*\n
        **Clear command**\nClears the queue for the server\nExample: *"abc clear"*\n`)
    
        textChannel.send({embeds: [embed]})
    }
    catch(err) {
        console.log(err)
    }
}

client.login(process.env.TOKEN)