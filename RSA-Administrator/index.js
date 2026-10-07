require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    Partials,
    REST,
    Routes,
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const BRAND_COLOUR = "#2F4DA8";
const LOGO = "<:Our_Logo:1557149633623363594>";

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
    console.error("Missing DISCORD_TOKEN, CLIENT_ID or GUILD_ID.");
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

// ============================================================
// DATA
// ============================================================

const dataFolder = path.join(__dirname, "data");

if (!fs.existsSync(dataFolder)) {
    fs.mkdirSync(dataFolder, { recursive: true });
}

const warningsFile = path.join(dataFolder, "warnings.json");
const configFile = path.join(dataFolder, "config.json");

function loadJSON(file, fallback) {
    try {
        if (!fs.existsSync(file)) {
            fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
            return fallback;
        }

        return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (error) {
        console.error("JSON LOAD ERROR:", error);
        return fallback;
    }
}

function saveJSON(file, data) {
    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("JSON SAVE ERROR:", error);
    }
}

let warnings = loadJSON(warningsFile, {});
let config = loadJSON(configFile, {});

const submissions = new Map();

function guildConfig(guildId) {
    if (!config[guildId]) config[guildId] = {};
    return config[guildId];
}

function embed(title, description) {
    return new EmbedBuilder()
        .setColor(BRAND_COLOUR)
        .setTitle(`${LOGO} ${title}`)
        .setDescription(description || null)
        .setTimestamp();
}

function canManage(member) {
    return member &&
        (
            member.permissions.has(PermissionFlagsBits.ManageGuild) ||
            member.permissions.has(PermissionFlagsBits.Administrator)
        );
}

function isStaff(member) {
    if (!member) return false;

    if (member.permissions.has(PermissionFlagsBits.Administrator)) {
        return true;
    }

    const cfg = guildConfig(member.guild.id);

    return Boolean(
        cfg.staffRoleId &&
        member.roles.cache.has(cfg.staffRoleId)
    );
}

function safeName(value) {
    return String(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .substring(0, 70) || "user";
}

// ============================================================
// COMMANDS
// ============================================================

const commands = [

    new SlashCommandBuilder()
        .setName("help")
        .setDescription("Shows all commands"),

    new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Checks bot latency"),

    new SlashCommandBuilder()
        .setName("botinfo")
        .setDescription("Shows bot information"),

    new SlashCommandBuilder()
        .setName("serverinfo")
        .setDescription("Shows server information"),

    new SlashCommandBuilder()
        .setName("userinfo")
        .setDescription("Shows user information")
        .addUserOption(o =>
            o.setName("user")
                .setDescription("User")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("profile")
        .setDescription("Shows your profile"),

    new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Bans a member")
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(o =>
            o.setName("user")
                .setDescription("Member")
                .setRequired(true)
        )
        .addStringOption(o =>
            o.setName("reason")
                .setDescription("Reason")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("kick")
        .setDescription("Kicks a member")
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption(o =>
            o.setName("user")
                .setDescription("Member")
                .setRequired(true)
        )
        .addStringOption(o =>
            o.setName("reason")
                .setDescription("Reason")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("timeout")
        .setDescription("Times out a member")
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(o =>
            o.setName("user")
                .setDescription("Member")
                .setRequired(true)
        )
        .addIntegerOption(o =>
            o.setName("minutes")
                .setDescription("Minutes")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(40320)
        )
        .addStringOption(o =>
            o.setName("reason")
                .setDescription("Reason")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("untimeout")
        .setDescription("Removes a timeout")
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(o =>
            o.setName("user")
                .setDescription("Member")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("warn")
        .setDescription("Warns a member")
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(o =>
            o.setName("user")
                .setDescription("Member")
                .setRequired(true)
        )
        .addStringOption(o =>
            o.setName("reason")
                .setDescription("Reason")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("warnings")
        .setDescription("Shows warnings")
        .addUserOption(o =>
            o.setName("user")
                .setDescription("User")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("clearwarnings")
        .setDescription("Clears warnings")
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(o =>
            o.setName("user")
                .setDescription("User")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("purge")
        .setDescription("Deletes messages")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption(o =>
            o.setName("amount")
                .setDescription("Amount")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        ),

    new SlashCommandBuilder()
        .setName("lock")
        .setDescription("Locks this channel")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    new SlashCommandBuilder()
        .setName("unlock")
        .setDescription("Unlocks this channel")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    new SlashCommandBuilder()
        .setName("slowmode")
        .setDescription("Sets slowmode")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addIntegerOption(o =>
            o.setName("seconds")
                .setDescription("Seconds")
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(21600)
        ),

    new SlashCommandBuilder()
        .setName("role")
        .setDescription("Manage roles")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addSubcommand(s =>
            s.setName("add")
                .setDescription("Adds a role")
                .addUserOption(o =>
                    o.setName("user").setDescription("User").setRequired(true)
                )
                .addRoleOption(o =>
                    o.setName("role").setDescription("Role").setRequired(true)
                )
        )
        .addSubcommand(s =>
            s.setName("remove")
                .setDescription("Removes a role")
                .addUserOption(o =>
                    o.setName("user").setDescription("User").setRequired(true)
                )
                .addRoleOption(o =>
                    o.setName("role").setDescription("Role").setRequired(true)
                )
        ),

    new SlashCommandBuilder()
        .setName("announce")
        .setDescription("Creates an announcement")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(o =>
            o.setName("message")
                .setDescription("Announcement")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("embed")
        .setDescription("Open the webhook embed builder")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    new SlashCommandBuilder()
        .setName("ticketconfig")
        .setDescription("Configure tickets")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    new SlashCommandBuilder()
        .setName("submitconfig")
        .setDescription("Configure server submissions")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    new SlashCommandBuilder()
        .setName("reportsetup")
        .setDescription("Configure server reports")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    new SlashCommandBuilder()
        .setName("verification")
        .setDescription("Show verification configuration")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

].map(c => c.toJSON());

// ============================================================
// REGISTER
// ============================================================

async function registerCommands() {
    try {
        const rest = new REST({ version: "10" }).setToken(TOKEN);

        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );

        console.log(`Registered ${commands.length} commands.`);
    } catch (error) {
        console.error("COMMAND REGISTRATION ERROR:", error);
    }
}

// ============================================================
// READY
// ============================================================

client.once("ready", async () => {
    console.log(`Logged in as ${client.user.tag}`);
    console.log(`Serving ${client.guilds.cache.size} server(s).`);

    await registerCommands();

    client.user.setActivity("server submissions", {
        type: 3
    });
});

// ============================================================
// WELCOME
// ============================================================

client.on("guildMemberAdd", async member => {
    try {
        const cfg = guildConfig(member.guild.id);

        if (!cfg.welcomeChannelId) return;

        const channel = member.guild.channels.cache.get(
            cfg.welcomeChannelId
        );

        if (!channel) return;

        const welcome = embed(
            "Welcome!",
            `Welcome ${member} to **${member.guild.name}**!\n\n` +
            `We hope you enjoy your time here.`
        );

        // IMPORTANT: no thumbnail / user avatar
        await channel.send({
            embeds: [welcome]
        });
    } catch (error) {
        console.error("WELCOME ERROR:", error);
    }
});

// ============================================================
// HELP
// ============================================================

function helpEmbed() {
    return embed(
        "Commands",
        "Here are the available commands."
    ).addFields(
        {
            name: "General",
            value:
                "`/help`\n`/ping`\n`/botinfo`\n`/serverinfo`\n`/userinfo`\n`/profile`"
        },
        {
            name: "Moderation",
            value:
                "`/ban`\n`/kick`\n`/timeout`\n`/untimeout`\n`/warn`\n`/warnings`\n`/clearwarnings`\n`/purge`"
        },
        {
            name: "Management",
            value:
                "`/lock`\n`/unlock`\n`/slowmode`\n`/role`\n`/announce`\n`/embed`"
        },
        {
            name: "Systems",
            value:
                "`/ticketconfig`\n`/submitconfig`\n`/reportsetup`\n`/verification`"
        }
    );
}

// ============================================================
// INTERACTIONS
// ============================================================

client.on("interactionCreate", async interaction => {

    try {

        // ======================================================
        // SLASH COMMANDS
        // ======================================================

        if (interaction.isChatInputCommand()) {

            const command = interaction.commandName;

            if (command === "help") {
                return interaction.reply({
                    embeds: [helpEmbed()],
                    ephemeral: true
                });
            }

            if (command === "ping") {
                return interaction.reply({
                    content: `Pong! ${client.ws.ping}ms`,
                    ephemeral: true
                });
            }

            if (command === "botinfo") {
                return interaction.reply({
                    embeds: [
                        embed(
                            "Bot Information",
                            `**Bot:** ${client.user.tag}\n` +
                            `**Servers:** ${client.guilds.cache.size}\n` +
                            `**Discord.js:** v14`
                        )
                    ]
                });
            }

            if (command === "serverinfo") {
                const g = interaction.guild;

                return interaction.reply({
                    embeds: [
                        embed(
                            g.name,
                            `**Owner:** <@${g.ownerId}>\n` +
                            `**Members:** ${g.memberCount}\n` +
                            `**Channels:** ${g.channels.cache.size}\n` +
                            `**Roles:** ${g.roles.cache.size}`
                        )
                    ]
                });
            }

            if (command === "userinfo") {
                const user =
                    interaction.options.getUser("user") ||
                    interaction.user;

                const member =
                    await interaction.guild.members
                        .fetch(user.id)
                        .catch(() => null);

                const e = embed(
                    "User Information",
                    `**Username:** ${user.tag}\n` +
                    `**ID:** ${user.id}\n` +
                    `**Created:** <t:${Math.floor(user.createdTimestamp / 1000)}:F>`
                );

                if (member?.joinedTimestamp) {
                    e.addFields({
                        name: "Joined",
                        value:
                            `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`
                    });
                }

                return interaction.reply({
                    embeds: [e]
                });
            }

            if (command === "profile") {
                const member = interaction.member;

                return interaction.reply({
                    embeds: [
                        embed(
                            `${interaction.user.username}'s Profile`,
                            `**Username:** ${interaction.user.tag}\n` +
                            `**Joined:** <t:${Math.floor(member.joinedTimestamp / 1000)}:R>\n\n` +
                            `**Roles:** ${
                                member.roles.cache
                                    .filter(r => r.id !== interaction.guild.id)
                                    .map(r => r.toString())
                                    .join(", ") || "None"
                            }`
                        )
                    ]
                });
            }

            if (command === "ban") {
                const user = interaction.options.getUser("user");
                const reason =
                    interaction.options.getString("reason") ||
                    "No reason provided";

                const member =
                    await interaction.guild.members
                        .fetch(user.id)
                        .catch(() => null);

                if (!member) {
                    return interaction.reply({
                        content: "Member not found.",
                        ephemeral: true
                    });
                }

                await member.ban({ reason });

                return interaction.reply(
                    `Banned **${user.tag}**.\nReason: ${reason}`
                );
            }

            if (command === "kick") {
                const user = interaction.options.getUser("user");
                const reason =
                    interaction.options.getString("reason") ||
                    "No reason provided";

                const member =
                    await interaction.guild.members
                        .fetch(user.id)
                        .catch(() => null);

                if (!member) {
                    return interaction.reply({
                        content: "Member not found.",
                        ephemeral: true
                    });
                }

                await member.kick(reason);

                return interaction.reply(
                    `Kicked **${user.tag}**.\nReason: ${reason}`
                );
            }

            if (command === "timeout") {
                const user = interaction.options.getUser("user");
                const minutes = interaction.options.getInteger("minutes");
                const reason =
                    interaction.options.getString("reason") ||
                    "No reason provided";

                const member =
                    await interaction.guild.members
                        .fetch(user.id)
                        .catch(() => null);

                if (!member) {
                    return interaction.reply({
                        content: "Member not found.",
                        ephemeral: true
                    });
                }

                await member.timeout(
                    minutes * 60 * 1000,
                    reason
                );

                return interaction.reply(
                    `Timed out **${user.tag}** for ${minutes} minute(s).`
                );
            }

            if (command === "untimeout") {
                const user = interaction.options.getUser("user");

                const member =
                    await interaction.guild.members
                        .fetch(user.id)
                        .catch(() => null);

                if (!member) {
                    return interaction.reply({
                        content: "Member not found.",
                        ephemeral: true
                    });
                }

                await member.timeout(null);

                return interaction.reply(
                    `Removed timeout from **${user.tag}**.`
                );
            }

            if (command === "warn") {
                const user = interaction.options.getUser("user");
                const reason =
                    interaction.options.getString("reason");

                if (!warnings[interaction.guild.id]) {
                    warnings[interaction.guild.id] = {};
                }

                if (!warnings[interaction.guild.id][user.id]) {
                    warnings[interaction.guild.id][user.id] = [];
                }

                warnings[interaction.guild.id][user.id].push({
                    reason,
                    moderator: interaction.user.id,
                    timestamp: Date.now()
                });

                saveJSON(warningsFile, warnings);

                return interaction.reply(
                    `Warned **${user.tag}**.\nReason: ${reason}`
                );
            }

            if (command === "warnings") {
                const user =
                    interaction.options.getUser("user") ||
                    interaction.user;

                const list =
                    warnings[interaction.guild.id]?.[user.id] || [];

                if (!list.length) {
                    return interaction.reply({
                        content: `**${user.tag}** has no warnings.`,
                        ephemeral: true
                    });
                }

                return interaction.reply({
                    embeds: [
                        embed(
                            `Warnings — ${user.tag}`,
                            list.map(
                                (w, i) =>
                                    `**${i + 1}.** ${w.reason} — <@${w.moderator}>`
                            ).join("\n")
                        )
                    ]
                });
            }

            if (command === "clearwarnings") {
                const user = interaction.options.getUser("user");

                if (warnings[interaction.guild.id]) {
                    delete warnings[interaction.guild.id][user.id];
                }

                saveJSON(warningsFile, warnings);

                return interaction.reply(
                    `Cleared warnings for **${user.tag}**.`
                );
            }

            if (command === "purge") {
                const amount =
                    interaction.options.getInteger("amount");

                await interaction.channel.bulkDelete(amount, true);

                return interaction.reply({
                    content: `Deleted ${amount} message(s).`,
                    ephemeral: true
                });
            }

            if (command === "lock") {
                await interaction.channel.permissionOverwrites.edit(
                    interaction.guild.roles.everyone,
                    { SendMessages: false }
                );

                return interaction.reply("Channel locked.");
            }

            if (command === "unlock") {
                await interaction.channel.permissionOverwrites.edit(
                    interaction.guild.roles.everyone,
                    { SendMessages: null }
                );

                return interaction.reply("Channel unlocked.");
            }

            if (command === "slowmode") {
                const seconds =
                    interaction.options.getInteger("seconds");

                await interaction.channel.setRateLimitPerUser(seconds);

                return interaction.reply(
                    seconds === 0
                        ? "Slowmode disabled."
                        : `Slowmode set to ${seconds} seconds.`
                );
            }

            if (command === "role") {
                const sub = interaction.options.getSubcommand();
                const member =
                    interaction.options.getMember("user");
                const role =
                    interaction.options.getRole("role");

                if (
                    role.position >=
                    interaction.member.roles.highest.position
                ) {
                    return interaction.reply({
                        content: "You cannot manage that role.",
                        ephemeral: true
                    });
                }

                if (sub === "add") {
                    await member.roles.add(role);
                    return interaction.reply(
                        `Added ${role} to **${member.user.tag}**.`
                    );
                }

                await member.roles.remove(role);

                return interaction.reply(
                    `Removed ${role} from **${member.user.tag}**.`
                );
            }

            if (command === "announce") {
                const message =
                    interaction.options.getString("message");

                return interaction.reply({
                    embeds: [
                        embed("Announcement", message)
                            .setFooter({
                                text: `Posted by ${interaction.user.tag}`
                            })
                    ]
                });
            }

            // ==================================================
            // EMBED BUILDER
            // ==================================================

            if (command === "embed") {

                const modal = new ModalBuilder()
                    .setCustomId("embed_builder")
                    .setTitle("Webhook Embed Builder");

                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("embed_title")
                            .setLabel("Title")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                            .setMaxLength(256)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("embed_description")
                            .setLabel("Description")
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(true)
                            .setMaxLength(4000)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("embed_channel")
                            .setLabel("Channel ID")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("webhook_name")
                            .setLabel("Webhook Name")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(false)
                            .setPlaceholder("Server Listing")
                    )
                );

                return interaction.showModal(modal);
            }

            // ==================================================
            // CONFIG COMMANDS
            // ==================================================

            if (command === "ticketconfig") {
                if (!canManage(interaction.member)) {
                    return interaction.reply({
                        content: "You need Manage Server permissions.",
                        ephemeral: true
                    });
                }

                return ticketConfigPanel(interaction);
            }

            if (command === "submitconfig") {
                if (!canManage(interaction.member)) {
                    return interaction.reply({
                        content: "You need Manage Server permissions.",
                        ephemeral: true
                    });
                }

                return submitConfigPanel(interaction);
            }

            if (command === "reportsetup") {
                if (!canManage(interaction.member)) {
                    return interaction.reply({
                        content: "You need Manage Server permissions.",
                        ephemeral: true
                    });
                }

                return reportConfigPanel(interaction);
            }

            if (command === "verification") {
                const cfg = guildConfig(interaction.guild.id);

                return interaction.reply({
                    embeds: [
                        embed(
                            "Verification Configuration",
                            `**Verified Channel:** ${
                                cfg.verifiedChannelId
                                    ? `<#${cfg.verifiedChannelId}>`
                                    : "Not configured"
                            }\n` +
                            `**Verified Role:** ${
                                cfg.verifiedRoleId
                                    ? `<@&${cfg.verifiedRoleId}>`
                                    : "Not configured"
                            }\n\n` +
                            "Servers are manually reviewed before being listed."
                        )
                    ],
                    ephemeral: true
                });
            }
        }

        // ======================================================
        // BUTTONS
        // ======================================================

        if (interaction.isButton()) {

            // OPEN TICKET
            if (interaction.customId === "open_ticket") {

                const cfg = guildConfig(interaction.guild.id);

                if (!cfg.ticketStaffRoleId) {
                    return interaction.reply({
                        content: "Tickets have not been configured.",
                        ephemeral: true
                    });
                }

                const existing =
                    interaction.guild.channels.cache.find(
                        c =>
                            c.topic ===
                            `ticket-owner:${interaction.user.id}`
                    );

                if (existing) {
                    return interaction.reply({
                        content: `You already have a ticket: ${existing}`,
                        ephemeral: true
                    });
                }

                const staffRole =
                    interaction.guild.roles.cache.get(
                        cfg.ticketStaffRoleId
                    );

                const channel =
                    await interaction.guild.channels.create({
                        name: `ticket-${safeName(interaction.user.username)}`,
                        type: ChannelType.GuildText,
                        parent: cfg.ticketCategoryId || undefined,
                        topic: `ticket-owner:${interaction.user.id}`,
                        permissionOverwrites: [
                            {
                                id: interaction.guild.id,
                                deny: [PermissionFlagsBits.ViewChannel]
                            },
                            {
                                id: interaction.user.id,
                                allow: [
                                    PermissionFlagsBits.ViewChannel,
                                    PermissionFlagsBits.SendMessages,
                                    PermissionFlagsBits.ReadMessageHistory
                                ]
                            },
                            {
                                id: staffRole.id,
                                allow: [
                                    PermissionFlagsBits.ViewChannel,
                                    PermissionFlagsBits.SendMessages,
                                    PermissionFlagsBits.ReadMessageHistory
                                ]
                            },
                            {
                                id: client.user.id,
                                allow: [
                                    PermissionFlagsBits.ViewChannel,
                                    PermissionFlagsBits.SendMessages,
                                    PermissionFlagsBits.ReadMessageHistory,
                                    PermissionFlagsBits.ManageChannels
                                ]
                            }
                        ]
                    });

                const buttons =
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId("claim_ticket")
                            .setLabel("Claim")
                            .setStyle(ButtonStyle.Primary),

                        new ButtonBuilder()
                            .setCustomId("close_ticket")
                            .setLabel("Close")
                            .setStyle(ButtonStyle.Danger)
                    );

                await channel.send({
                    content: `${staffRole} ${interaction.user}`,
                    embeds: [
                        embed(
                            "Support Ticket",
                            `Welcome ${interaction.user}!\n\nPlease explain what you need help with.`
                        )
                    ],
                    components: [buttons]
                });

                return interaction.reply({
                    content: `Your ticket has been created: ${channel}`,
                    ephemeral: true
                });
            }

            // CLAIM
            if (interaction.customId === "claim_ticket") {
                if (!isStaff(interaction.member)) {
                    return interaction.reply({
                        content: "Only staff can claim tickets.",
                        ephemeral: true
                    });
                }

                return interaction.reply({
                    embeds: [
                        embed(
                            "Ticket Claimed",
                            `This ticket has been claimed by ${interaction.user}.`
                        )
                    ]
                });
            }

            // CLOSE
            if (interaction.customId === "close_ticket") {
                if (!isStaff(interaction.member)) {
                    return interaction.reply({
                        content: "Only staff can close tickets.",
                        ephemeral: true
                    });
                }

                await interaction.reply({
                    embeds: [
                        embed(
                            "Ticket Closed",
                            `This ticket will be deleted in 5 seconds.\n\nClosed by ${interaction.user}.`
                        )
                    ]
                });

                setTimeout(() => {
                    interaction.channel.delete().catch(() => {});
                }, 5000);

                return;
            }

            // REPORT SERVER
            if (interaction.customId === "report_server") {

                const modal = new ModalBuilder()
                    .setCustomId("server_report_modal")
                    .setTitle("Report a Server");

                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("reported_server")
                            .setLabel("Server Name / Invite")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("report_reason")
                            .setLabel("Reason")
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(true)
                            .setMaxLength(1500)
                    )
                );

                return interaction.showModal(modal);
            }

            // SUBMIT SERVER
            if (interaction.customId === "submit_server") {

                const cfg = guildConfig(interaction.guild.id);

                if (!cfg.submitStaffRoleId) {
                    return interaction.reply({
                        content: "Server submissions have not been configured.",
                        ephemeral: true
                    });
                }

                const modal = new ModalBuilder()
                    .setCustomId("server_submission_modal")
                    .setTitle("Submit Your Server");

                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("server_name")
                            .setLabel("Server Name")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("server_description")
                            .setLabel("Server Description")
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(true)
                            .setMaxLength(1000)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("server_invite")
                            .setLabel("Discord Invite")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("server_category")
                            .setLabel("Category")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("server_owner")
                            .setLabel("Your Role")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    )
                );

                return interaction.showModal(modal);
            }

            // ACCEPT
            if (interaction.customId.startsWith("submission_accept_")) {

                if (!isStaff(interaction.member)) {
                    return interaction.reply({
                        content: "Only staff can approve submissions.",
                        ephemeral: true
                    });
                }

                const id =
                    interaction.customId.replace(
                        "submission_accept_",
                        ""
                    );

                const submission = submissions.get(id);

                if (!submission) {
                    return interaction.reply({
                        content: "This submission is no longer available.",
                        ephemeral: true
                    });
                }

                const cfg = guildConfig(interaction.guild.id);

                if (!cfg.verifiedChannelId) {
                    return interaction.reply({
                        content: "No verified/community channel has been configured.",
                        ephemeral: true
                    });
                }

                const communityChannel =
                    interaction.guild.channels.cache.get(
                        cfg.verifiedChannelId
                    );

                if (!communityChannel) {
                    return interaction.reply({
                        content: "The configured community channel no longer exists.",
                        ephemeral: true
                    });
                }

                await interaction.deferReply({
                    ephemeral: true
                });

                // VERIFIED ROLE
                if (cfg.verifiedRoleId) {
                    const role =
                        interaction.guild.roles.cache.get(
                            cfg.verifiedRoleId
                        );

                    const member =
                        await interaction.guild.members
                            .fetch(submission.userId)
                            .catch(() => null);

                    if (role && member) {
                        await member.roles.add(role).catch(() => {});
                    }
                }

                // WEBHOOK
                let webhook = null;

                try {
                    const hooks =
                        await communityChannel.fetchWebhooks();

                    webhook =
                        hooks.find(
                            h =>
                                h.owner?.id ===
                                client.user.id
                        );

                    if (!webhook) {
                        webhook =
                            await communityChannel.createWebhook({
                                name: "Server Listing"
                            });
                    }
                } catch (error) {
                    console.error("WEBHOOK ERROR:", error);

                    return interaction.editReply(
                        "I couldn't create/use the community webhook. Check that I have Manage Webhooks permission."
                    );
                }

                // SERVER LISTING EMBED
                const listing = new EmbedBuilder()
                    .setColor(BRAND_COLOUR)
                    .setTitle(`${LOGO} Server Listing`)
                    .setDescription(
                        `**${submission.serverName}**\n\n${submission.description}`
                    )
                    .addFields(
                        {
                            name: "Category",
                            value: submission.category,
                            inline: true
                        },
                        {
                            name: "Server Owner",
                            value: `<@${submission.userId}>`,
                            inline: true
                        }
                    )
                    .setFooter({
                        text: "Verified Server"
                    })
                    .setTimestamp();

                // JOIN SERVER BUTTON
                const joinButton =
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setLabel("Join Server!")
                            .setStyle(ButtonStyle.Link)
                            .setURL(
                                submission.invite
                            )
                    );

                await webhook.send({
                    username: "Server Listing",
                    avatarURL: client.user.displayAvatarURL(),
                    embeds: [listing],
                    components: [joinButton]
                });

                // DM
                const user =
                    await client.users
                        .fetch(submission.userId)
                        .catch(() => null);

                if (user) {
                    await user.send({
                        embeds: [
                            embed(
                                "Server Approved",
                                `Your server **${submission.serverName}** has been approved and listed.`
                            )
                        ]
                    }).catch(() => {});
                }

                // SEND RESULT IN REVIEW CHANNEL
                await interaction.channel.send({
                    embeds: [
                        embed(
                            "Submission Accepted",
                            `**${submission.serverName}** has been accepted by ${interaction.user}.\n\nThe server has been added to the community listings.`
                        )
                    ]
                });

                // MARK BUTTONS DISABLED
                await interaction.message.edit({
                    components: [
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId("submission_done")
                                .setLabel("Accepted")
                                .setStyle(ButtonStyle.Success)
                                .setDisabled(true)
                        )
                    ]
                }).catch(() => {});

                submissions.delete(id);

                // DELETE REVIEW CHANNEL
                setTimeout(() => {
                    interaction.channel.delete().catch(() => {});
                }, 3000);

                return interaction.editReply(
                    "Submission accepted. The server has been listed and the review channel will close."
                );
            }

            // DENY
            if (interaction.customId.startsWith("submission_deny_")) {

                if (!isStaff(interaction.member)) {
                    return interaction.reply({
                        content: "Only staff can deny submissions.",
                        ephemeral: true
                    });
                }

                const id =
                    interaction.customId.replace(
                        "submission_deny_",
                        ""
                    );

                if (!submissions.has(id)) {
                    return interaction.reply({
                        content: "This submission is no longer available.",
                        ephemeral: true
                    });
                }

                const modal = new ModalBuilder()
                    .setCustomId(`deny_modal_${id}`)
                    .setTitle("Deny Submission");

                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("deny_reason")
                            .setLabel("Reason")
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(true)
                            .setMaxLength(1000)
                    )
                );

                return interaction.showModal(modal);
            }

            // CONFIG BUTTONS
            if (interaction.customId === "ticket_set_staff") {
                return selectRole(
                    interaction,
                    "ticket_staff_select",
                    "Select the ticket staff role."
                );
            }

            if (interaction.customId === "ticket_set_category") {
                return selectCategory(
                    interaction,
                    "ticket_category_select",
                    "Select the ticket category."
                );
            }

            if (interaction.customId === "ticket_set_logs") {
                return selectChannel(
                    interaction,
                    "ticket_logs_select",
                    "Select the ticket log channel."
                );
            }

            if (interaction.customId === "ticket_send_panel") {

                const row =
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId("open_ticket")
                            .setLabel("Open Ticket")
                            .setStyle(ButtonStyle.Primary)
                    );

                await interaction.channel.send({
                    embeds: [
                        embed(
                            "Support Tickets",
                            "Need help? Open a ticket below and a member of staff will assist you."
                        )
                    ],
                    components: [row]
                });

                return interaction.reply({
                    content: "Ticket panel sent.",
                    ephemeral: true
                });
            }

            if (interaction.customId === "submit_set_staff") {
                return selectRole(
                    interaction,
                    "submit_staff_select",
                    "Select the submission staff role."
                );
            }

            if (interaction.customId === "submit_set_review") {
                return selectCategory(
                    interaction,
                    "submit_review_select",
                    "Select the review category."
                );
            }

            if (interaction.customId === "submit_set_verified") {
                return selectChannel(
                    interaction,
                    "submit_verified_select",
                    "Select the community/verified channel."
                );
            }

            if (interaction.customId === "submit_set_verified_role") {
                return selectRole(
                    interaction,
                    "submit_verified_role_select",
                    "Select the verified role."
                );
            }

            if (interaction.customId === "submit_send_panel") {

                const row =
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId("submit_server")
                            .setLabel("Submit Server")
                            .setStyle(ButtonStyle.Primary)
                    );

                await interaction.channel.send({
                    embeds: [
                        embed(
                            "Submit Your Server",
                            "Want your server listed in our verified server community?\n\nClick **Submit Server** below.\n\nAll submissions are manually reviewed."
                        )
                    ],
                    components: [row]
                });

                return interaction.reply({
                    content: "Submission panel sent.",
                    ephemeral: true
                });
            }

            if (interaction.customId === "report_set_staff") {
                return selectRole(
                    interaction,
                    "report_staff_select",
                    "Select the staff role for server reports."
                );
            }

            if (interaction.customId === "report_set_category") {
                return selectCategory(
                    interaction,
                    "report_category_select",
                    "Select the category where reports are created."
                );
            }

            if (interaction.customId === "report_set_logs") {
                return selectChannel(
                    interaction,
                    "report_logs_select",
                    "Select the server report log channel."
                );
            }

            if (interaction.customId === "report_send_panel") {

                const row =
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId("report_server")
                            .setLabel("Report a Server")
                            .setStyle(ButtonStyle.Danger)
                    );

                await interaction.channel.send({
                    embeds: [
                        embed(
                            "Report a Server",
                            "If you believe a listed server breaks our rules, you can report it using the button below."
                        )
                    ],
                    components: [row]
                });

                return interaction.reply({
                    content: "Report panel sent.",
                    ephemeral: true
                });
            }
        }

        // ======================================================
        // SELECT MENUS
        // ======================================================

        if (interaction.isStringSelectMenu()) {

            const cfg = guildConfig(interaction.guild.id);
            const value = interaction.values[0];

            if (interaction.customId === "ticket_staff_select") {
                cfg.ticketStaffRoleId = value;
                cfg.staffRoleId = cfg.staffRoleId || value;
                saveJSON(configFile, config);

                return interaction.update({
                    content: `Ticket staff role set to <@&${value}>.`,
                    components: []
                });
            }

            if (interaction.customId === "ticket_category_select") {
                cfg.ticketCategoryId = value;
                saveJSON(configFile, config);

                return interaction.update({
                    content: `Ticket category set to <#${value}>.`,
                    components: []
                });
            }

            if (interaction.customId === "ticket_logs_select") {
                cfg.ticketLogsChannelId = value;
                saveJSON(configFile, config);

                return interaction.update({
                    content: `Ticket logs set to <#${value}>.`,
                    components: []
                });
            }

            if (interaction.customId === "submit_staff_select") {
                cfg.submitStaffRoleId = value;
                cfg.staffRoleId = cfg.staffRoleId || value;
                saveJSON(configFile, config);

                return interaction.update({
                    content: `Submission staff role set to <@&${value}>.`,
                    components: []
                });
            }

            if (interaction.customId === "submit_review_select") {
                cfg.submitReviewCategoryId = value;
                saveJSON(configFile, config);

                return interaction.update({
                    content: `Review category set to <#${value}>.`,
                    components: []
                });
            }

            if (interaction.customId === "submit_verified_select") {
                cfg.verifiedChannelId = value;
                saveJSON(configFile, config);

                return interaction.update({
                    content: `Community channel set to <#${value}>.`,
                    components: []
                });
            }

            if (interaction.customId === "submit_verified_role_select") {
                cfg.verifiedRoleId = value;
                saveJSON(configFile, config);

                return interaction.update({
                    content: `Verified role set to <@&${value}>.`,
                    components: []
                });
            }

            if (interaction.customId === "report_staff_select") {
                cfg.reportStaffRoleId = value;
                cfg.staffRoleId = cfg.staffRoleId || value;
                saveJSON(configFile, config);

                return interaction.update({
                    content: `Report staff role set to <@&${value}>.`,
                    components: []
                });
            }

            if (interaction.customId === "report_category_select") {
                cfg.reportCategoryId = value;
                saveJSON(configFile, config);

                return interaction.update({
                    content: `Report category set to <#${value}>.`,
                    components: []
                });
            }

            if (interaction.customId === "report_logs_select") {
                cfg.reportLogsChannelId = value;
                saveJSON(configFile, config);

                return interaction.update({
                    content: `Report logs set to <#${value}>.`,
                    components: []
                });
            }
        }

        // ======================================================
        // MODALS
        // ======================================================

        if (interaction.isModalSubmit()) {

            // EMBED BUILDER
            if (interaction.customId === "embed_builder") {

                const title =
                    interaction.fields.getTextInputValue("embed_title");

                const description =
                    interaction.fields.getTextInputValue("embed_description");

                const channelId =
                    interaction.fields.getTextInputValue("embed_channel");

                const webhookName =
                    interaction.fields.getTextInputValue("webhook_name") ||
                    "Server Listing";

                const channel =
                    interaction.guild.channels.cache.get(channelId);

                if (!channel || channel.type !== ChannelType.GuildText) {
                    return interaction.reply({
                        content: "That channel ID is invalid.",
                        ephemeral: true
                    });
                }

                let webhook;

                const hooks =
                    await channel.fetchWebhooks();

                webhook =
                    hooks.find(
                        h =>
                            h.owner?.id === client.user.id &&
                            h.name === webhookName
                    );

                if (!webhook) {
                    webhook =
                        await channel.createWebhook({
                            name: webhookName
                        });
                }

                const e =
                    new EmbedBuilder()
                        .setColor(BRAND_COLOUR)
                        .setTitle(`${LOGO} ${title}`)
                        .setDescription(description)
                        .setTimestamp();

                const sendButton =
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId("embed_send")
                            .setLabel("Send")
                            .setStyle(ButtonStyle.Success)
                    );

                // Store temporary embed
                interaction.client.embedBuilders =
                    interaction.client.embedBuilders || new Map();

                interaction.client.embedBuilders.set(
                    interaction.user.id,
                    {
                        webhookId: webhook.id,
                        channelId,
                        webhookName,
                        embed: e.toJSON()
                    }
                );

                return interaction.reply({
                    embeds: [
                        embed(
                            "Embed Preview",
                            "Your webhook embed is ready.\n\nUse the buttons below to send it."
                        ),
                        e
                    ],
                    components: [sendButton],
                    ephemeral: true
                });
            }

            // SERVER SUBMISSION
            if (interaction.customId === "server_submission_modal") {

                const serverName =
                    interaction.fields.getTextInputValue("server_name");

                const description =
                    interaction.fields.getTextInputValue("server_description");

                const invite =
                    interaction.fields.getTextInputValue("server_invite");

                const category =
                    interaction.fields.getTextInputValue("server_category");

                const owner =
                    interaction.fields.getTextInputValue("server_owner");

                const cfg = guildConfig(interaction.guild.id);

                const staffRole =
                    interaction.guild.roles.cache.get(
                        cfg.submitStaffRoleId
                    );

                if (!staffRole) {
                    return interaction.reply({
                        content: "Submission staff role is not configured.",
                        ephemeral: true
                    });
                }

                const id =
                    `${interaction.user.id}-${Date.now()}`;

                submissions.set(id, {
                    userId: interaction.user.id,
                    serverName,
                    description,
                    invite,
                    category,
                    owner,
                    createdAt: Date.now()
                });

                const reviewCategory =
                    interaction.guild.channels.cache.get(
                        cfg.submitReviewCategoryId
                    );

                const reviewChannel =
                    await interaction.guild.channels.create({
                        name: `review-${safeName(serverName)}`,
                        type: ChannelType.GuildText,
                        parent: reviewCategory || undefined,
                        permissionOverwrites: [
                            {
                                id: interaction.guild.id,
                                deny: [
                                    PermissionFlagsBits.ViewChannel
                                ]
                            },
                            {
                                id: staffRole.id,
                                allow: [
                                    PermissionFlagsBits.ViewChannel,
                                    PermissionFlagsBits.SendMessages,
                                    PermissionFlagsBits.ReadMessageHistory
                                ]
                            },
                            {
                                id: client.user.id,
                                allow: [
                                    PermissionFlagsBits.ViewChannel,
                                    PermissionFlagsBits.SendMessages,
                                    PermissionFlagsBits.ReadMessageHistory,
                                    PermissionFlagsBits.ManageChannels
                                ]
                            }
                        ]
                    });

                const buttons =
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(
                                `submission_accept_${id}`
                            )
                            .setLabel("Accept")
                            .setStyle(ButtonStyle.Success),

                        new ButtonBuilder()
                            .setCustomId(
                                `submission_deny_${id}`
                            )
                            .setLabel("Deny")
                            .setStyle(ButtonStyle.Danger)
                    );

                await reviewChannel.send({
                    content: `${staffRole} — new server submission.`,
                    embeds: [
                        embed(
                            "New Server Submission",
                            `**Submitted by:** <@${interaction.user.id}>`
                        ).addFields(
                            {
                                name: "Server Name",
                                value: serverName
                            },
                            {
                                name: "Description",
                                value: description
                            },
                            {
                                name: "Invite",
                                value: invite
                            },
                            {
                                name: "Category",
                                value: category
                            },
                            {
                                name: "Submitter Role",
                                value: owner
                            }
                        )
                    ],
                    components: [buttons]
                });

                return interaction.reply({
                    embeds: [
                        embed(
                            "Submission Received",
                            "Your server has been submitted for manual review.\n\nYou will receive a DM once staff make a decision."
                        )
                    ],
                    ephemeral: true
                });
            }

            // DENY
            if (interaction.customId.startsWith("deny_modal_")) {

                if (!isStaff(interaction.member)) {
                    return interaction.reply({
                        content: "Only staff can deny submissions.",
                        ephemeral: true
                    });
                }

                const id =
                    interaction.customId.replace(
                        "deny_modal_",
                        ""
                    );

                const submission = submissions.get(id);

                if (!submission) {
                    return interaction.reply({
                        content: "Submission no longer exists.",
                        ephemeral: true
                    });
                }

                const reason =
                    interaction.fields.getTextInputValue(
                        "deny_reason"
                    );

                const user =
                    await client.users
                        .fetch(submission.userId)
                        .catch(() => null);

                if (user) {
                    await user.send({
                        embeds: [
                            embed(
                                "Server Submission Denied",
                                `Your server **${submission.serverName}** was not approved.\n\n**Reason:** ${reason}`
                            )
                        ]
                    }).catch(() => {});
                }

                const cfg = guildConfig(interaction.guild.id);

                // Send result to configured community/log channel
                if (cfg.verifiedChannelId) {
                    const channel =
                        interaction.guild.channels.cache.get(
                            cfg.verifiedChannelId
                        );

                    if (channel) {
                        await channel.send({
                            embeds: [
                                embed(
                                    "Server Submission Denied",
                                    `The submission for **${submission.serverName}** was denied by ${interaction.user}.\n\n**Reason:** ${reason}`
                                )
                            ]
                        }).catch(() => {});
                    }
                }

                await interaction.channel.send({
                    embeds: [
                        embed(
                            "Submission Denied",
                            `Denied by ${interaction.user}.\n\n**Reason:** ${reason}`
                        )
                    ]
                });

                submissions.delete(id);

                await interaction.reply({
                    content: "The submitter has been notified.",
                    ephemeral: true
                });

                setTimeout(() => {
                    interaction.channel.delete().catch(() => {});
                }, 3000);

                return;
            }

            // SERVER REPORT
            if (interaction.customId === "server_report_modal") {

                const reportedServer =
                    interaction.fields.getTextInputValue(
                        "reported_server"
                    );

                const reason =
                    interaction.fields.getTextInputValue(
                        "report_reason"
                    );

                const cfg = guildConfig(interaction.guild.id);

                const staffRole =
                    interaction.guild.roles.cache.get(
                        cfg.reportStaffRoleId
                    );

                if (!staffRole) {
                    return interaction.reply({
                        content: "Server reports have not been configured.",
                        ephemeral: true
                    });
                }

                const category =
                    interaction.guild.channels.cache.get(
                        cfg.reportCategoryId
                    );

                const channel =
                    await interaction.guild.channels.create({
                        name:
                            `server-reports-${safeName(interaction.user.username)}`,
                        type: ChannelType.GuildText,
                        parent: category || undefined,
                        topic:
                            `report-owner:${interaction.user.id}`,
                        permissionOverwrites: [
                            {
                                id: interaction.guild.id,
                                deny: [
                                    PermissionFlagsBits.ViewChannel
                                ]
                            },
                            {
                                id: interaction.user.id,
                                allow: [
                                    PermissionFlagsBits.ViewChannel,
                                    PermissionFlagsBits.SendMessages,
                                    PermissionFlagsBits.ReadMessageHistory
                                ]
                            },
                            {
                                id: staffRole.id,
                                allow: [
                                    PermissionFlagsBits.ViewChannel,
                                    PermissionFlagsBits.SendMessages,
                                    PermissionFlagsBits.ReadMessageHistory
                                ]
                            },
                            {
                                id: client.user.id,
                                allow: [
                                    PermissionFlagsBits.ViewChannel,
                                    PermissionFlagsBits.SendMessages,
                                    PermissionFlagsBits.ReadMessageHistory,
                                    PermissionFlagsBits.ManageChannels
                                ]
                            }
                        ]
                    });

                const buttons =
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId("close_report")
                            .setLabel("Close Report")
                            .setStyle(ButtonStyle.Danger)
                    );

                await channel.send({
                    content: `${staffRole} ${interaction.user}`,
                    embeds: [
                        embed(
                            "Server Report",
                            `**Reported by:** ${interaction.user}\n\n` +
                            `**Reported Server:** ${reportedServer}\n\n` +
                            `**Reason:** ${reason}`
                        )
                    ],
                    components: [buttons]
                });

                if (cfg.reportLogsChannelId) {
                    const logs =
                        interaction.guild.channels.cache.get(
                            cfg.reportLogsChannelId
                        );

                    if (logs) {
                        await logs.send({
                            embeds: [
                                embed(
                                    "New Server Report",
                                    `**Reporter:** ${interaction.user}\n` +
                                    `**Server:** ${reportedServer}\n` +
                                    `**Reason:** ${reason}\n` +
                                    `**Ticket:** ${channel}`
                                )
                            ]
                        }).catch(() => {});
                    }
                }

                return interaction.reply({
                    content: `Your report has been opened: ${channel}`,
                    ephemeral: true
                });
            }
        }

    } catch (error) {

        console.error("INTERACTION ERROR:", error);

        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: "Something went wrong while processing that action.",
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: "Something went wrong while processing that action.",
                    ephemeral: true
                });
            }
        } catch {}
    }
});

// ============================================================
// EMBED SEND BUTTON
// ============================================================

client.on("interactionCreate", async interaction => {

    if (!interaction.isButton()) return;

    if (interaction.customId === "embed_send") {

        try {

            const builders =
                client.embedBuilders;

            if (!builders) {
                return interaction.reply({
                    content: "The embed builder has expired.",
                    ephemeral: true
                });
            }

            const data =
                builders.get(interaction.user.id);

            if (!data) {
                return interaction.reply({
                    content: "The embed builder has expired.",
                    ephemeral: true
                });
            }

            const channel =
                interaction.guild.channels.cache.get(
                    data.channelId
                );

            if (!channel) {
                return interaction.reply({
                    content: "The selected channel no longer exists.",
                    ephemeral: true
                });
            }

            let webhook;

            const hooks =
                await channel.fetchWebhooks();

            webhook =
                hooks.find(
                    h =>
                        h.owner?.id === client.user.id &&
                        h.name === data.webhookName
                );

            if (!webhook) {
                webhook =
                    await channel.createWebhook({
                        name: data.webhookName
                    });
            }

            await webhook.send({
                username: data.webhookName,
                avatarURL: client.user.displayAvatarURL(),
                embeds: [data.embed]
            });

            builders.delete(interaction.user.id);

            return interaction.update({
                content: `Webhook embed sent to ${channel}.`,
                embeds: [],
                components: []
            });

        } catch (error) {
            console.error("EMBED SEND ERROR:", error);

            return interaction.reply({
                content: "I couldn't send the webhook embed. Check my Manage Webhooks permission.",
                ephemeral: true
            });
        }
    }

    if (interaction.customId === "close_report") {

        if (!isStaff(interaction.member)) {
            return interaction.reply({
                content: "Only staff can close reports.",
                ephemeral: true
            });
        }

        const cfg =
            guildConfig(interaction.guild.id);

        if (cfg.reportLogsChannelId) {
            const logs =
                interaction.guild.channels.cache.get(
                    cfg.reportLogsChannelId
                );

            if (logs) {
                await logs.send({
                    embeds: [
                        embed(
                            "Server Report Closed",
                            `Report **${interaction.channel.name}** was closed by ${interaction.user}.`
                        )
                    ]
                }).catch(() => {});
            }
        }

        await interaction.reply({
            embeds: [
                embed(
                    "Report Closed",
                    `Closed by ${interaction.user}.\n\nThis channel will be deleted in 5 seconds.`
                )
            ]
        });

        setTimeout(() => {
            interaction.channel.delete().catch(() => {});
        }, 5000);
    }
});

// ============================================================
// SELECT HELPERS
// ============================================================

async function selectRole(interaction, customId, text) {

    const roles =
        interaction.guild.roles.cache
            .filter(r => r.id !== interaction.guild.id)
            .first(25);

    if (!roles.length) {
        return interaction.reply({
            content: "No roles are available.",
            ephemeral: true
        });
    }

    const menu =
        new StringSelectMenuBuilder()
            .setCustomId(customId)
            .setPlaceholder(text)
            .addOptions(
                roles.map(r => ({
                    label: r.name.substring(0, 100),
                    value: r.id
                }))
            );

    return interaction.reply({
        content: text,
        components: [
            new ActionRowBuilder().addComponents(menu)
        ],
        ephemeral: true
    });
}

async function selectCategory(interaction, customId, text) {

    const categories =
        interaction.guild.channels.cache
            .filter(c => c.type === ChannelType.GuildCategory)
            .first(25);

    if (!categories.length) {
        return interaction.reply({
            content: "No categories are available.",
            ephemeral: true
        });
    }

    const menu =
        new StringSelectMenuBuilder()
            .setCustomId(customId)
            .setPlaceholder(text)
            .addOptions(
                categories.map(c => ({
                    label: c.name.substring(0, 100),
                    value: c.id
                }))
            );

    return interaction.reply({
        content: text,
        components: [
            new ActionRowBuilder().addComponents(menu)
        ],
        ephemeral: true
    });
}

async function selectChannel(interaction, customId, text) {

    const channels =
        interaction.guild.channels.cache
            .filter(c => c.type === ChannelType.GuildText)
            .first(25);

    if (!channels.length) {
        return interaction.reply({
            content: "No text channels are available.",
            ephemeral: true
        });
    }

    const menu =
        new StringSelectMenuBuilder()
            .setCustomId(customId)
            .setPlaceholder(text)
            .addOptions(
                channels.map(c => ({
                    label: c.name.substring(0, 100),
                    value: c.id
                }))
            );

    return interaction.reply({
        content: text,
        components: [
            new ActionRowBuilder().addComponents(menu)
        ],
        ephemeral: true
    });
}

// ============================================================
// TICKET CONFIG PANEL
// ============================================================

async function ticketConfigPanel(interaction) {

    const cfg = guildConfig(interaction.guild.id);

    const staff =
        cfg.ticketStaffRoleId
            ? `<@&${cfg.ticketStaffRoleId}>`
            : "Not configured";

    const category =
        cfg.ticketCategoryId
            ? `<#${cfg.ticketCategoryId}>`
            : "Not configured";

    const logs =
        cfg.ticketLogsChannelId
            ? `<#${cfg.ticketLogsChannelId}>`
            : "Not configured";

    const row =
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("ticket_set_staff")
                .setLabel("Staff Role")
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId("ticket_set_category")
                .setLabel("Category")
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId("ticket_set_logs")
                .setLabel("Ticket Logs")
                .setStyle(ButtonStyle.Secondary)
        );

    const row2 =
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("ticket_send_panel")
                .setLabel("Send Panel")
                .setStyle(ButtonStyle.Success)
        );

    return interaction.reply({
        embeds: [
            embed(
                "Ticket Configuration",
                "Configure your ticket system."
            ).addFields(
                {
                    name: "Staff Role",
                    value: staff,
                    inline: true
                },
                {
                    name: "Category",
                    value: category,
                    inline: true
                },
                {
                    name: "Ticket Logs",
                    value: logs,
                    inline: true
                }
            )
        ],
        components: [row, row2],
        ephemeral: true
    });
}

// ============================================================
// SUBMISSION CONFIG
// ============================================================

async function submitConfigPanel(interaction) {

    const cfg = guildConfig(interaction.guild.id);

    return interaction.reply({
        embeds: [
            embed(
                "Server Submission Configuration",
                "Configure manual server verification."
            ).addFields(
                {
                    name: "Submission Staff",
                    value:
                        cfg.submitStaffRoleId
                            ? `<@&${cfg.submitStaffRoleId}>`
                            : "Not configured",
                    inline: true
                },
                {
                    name: "Review Category",
                    value:
                        cfg.submitReviewCategoryId
                            ? `<#${cfg.submitReviewCategoryId}>`
                            : "Not configured",
                    inline: true
                },
                {
                    name: "Community Channel",
                    value:
                        cfg.verifiedChannelId
                            ? `<#${cfg.verifiedChannelId}>`
                            : "Not configured",
                    inline: true
                },
                {
                    name: "Verified Role",
                    value:
                        cfg.verifiedRoleId
                            ? `<@&${cfg.verifiedRoleId}>`
                            : "Not configured",
                    inline: true
                }
            )
        ],
        components: [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("submit_set_staff")
                    .setLabel("Staff Role")
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId("submit_set_review")
                    .setLabel("Review Category")
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId("submit_set_verified")
                    .setLabel("Community Channel")
                    .setStyle(ButtonStyle.Secondary)
            ),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("submit_set_verified_role")
                    .setLabel("Verified Role")
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId("submit_send_panel")
                    .setLabel("Send Panel")
                    .setStyle(ButtonStyle.Success)
            )
        ],
        ephemeral: true
    });
}

// ============================================================
// REPORT CONFIG
// ============================================================

async function reportConfigPanel(interaction) {

    const cfg = guildConfig(interaction.guild.id);

    return interaction.reply({
        embeds: [
            embed(
                "Server Report Configuration",
                "Configure reports for servers listed in your community."
            ).addFields(
                {
                    name: "Report Staff",
                    value:
                        cfg.reportStaffRoleId
                            ? `<@&${cfg.reportStaffRoleId}>`
                            : "Not configured",
                    inline: true
                },
                {
                    name: "Report Category",
                    value:
                        cfg.reportCategoryId
                            ? `<#${cfg.reportCategoryId}>`
                            : "Not configured",
                    inline: true
                },
                {
                    name: "Report Logs",
                    value:
                        cfg.reportLogsChannelId
                            ? `<#${cfg.reportLogsChannelId}>`
                            : "Not configured",
                    inline: true
                }
            )
        ],
        components: [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("report_set_staff")
                    .setLabel("Staff Role")
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId("report_set_category")
                    .setLabel("Report Category")
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId("report_set_logs")
                    .setLabel("Report Logs")
                    .setStyle(ButtonStyle.Secondary)
            ),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("report_send_panel")
                    .setLabel("Send Panel")
                    .setStyle(ButtonStyle.Success)
            )
        ],
        ephemeral: true
    });
}

// ============================================================
// CLEAN OLD SUBMISSIONS
// ============================================================

setInterval(() => {

    const now = Date.now();

    for (const [id, submission] of submissions) {

        if (
            submission.createdAt &&
            now - submission.createdAt >
            24 * 60 * 60 * 1000
        ) {
            submissions.delete(id);
        }
    }

}, 30 * 60 * 1000);

// ============================================================
// ERROR HANDLERS
// ============================================================

process.on("unhandledRejection", error => {
    console.error("UNHANDLED REJECTION:", error);
});

process.on("uncaughtException", error => {
    console.error("UNCAUGHT EXCEPTION:", error);
});

// ============================================================
// LOGIN
// ============================================================

client.login(TOKEN);
