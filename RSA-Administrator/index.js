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

// ============================================================
// CONFIG
// ============================================================

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const BRAND_COLOUR = "#2F4DA8";
const LOGO = "<:Our_Logo:1557149633623363594>";

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
    console.error(
        "Missing DISCORD_TOKEN, CLIENT_ID or GUILD_ID in .env"
    );
    process.exit(1);
}

// ============================================================
// CLIENT
// ============================================================

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

function loadJSON(file, fallback = {}) {
    try {
        if (!fs.existsSync(file)) {
            fs.writeFileSync(
                file,
                JSON.stringify(fallback, null, 2)
            );
            return fallback;
        }

        return JSON.parse(
            fs.readFileSync(file, "utf8")
        );
    } catch (error) {
        console.error(`Could not load ${file}:`, error);
        return fallback;
    }
}

function saveJSON(file, data) {
    try {
        fs.writeFileSync(
            file,
            JSON.stringify(data, null, 2)
        );
    } catch (error) {
        console.error(`Could not save ${file}:`, error);
    }
}

let warnings = loadJSON(warningsFile, {});
let config = loadJSON(configFile, {});

// Temporary submissions
const submissions = new Map();

// ============================================================
// HELPERS
// ============================================================

function getGuildConfig(guildId) {
    if (!config[guildId]) {
        config[guildId] = {};
    }

    return config[guildId];
}

function createEmbed(title, description = "") {
    return new EmbedBuilder()
        .setColor(BRAND_COLOUR)
        .setTitle(`${LOGO} ${title}`)
        .setDescription(description || null)
        .setTimestamp();
}

function canManage(member) {
    return (
        member.permissions.has(
            PermissionFlagsBits.ManageGuild
        ) ||
        member.permissions.has(
            PermissionFlagsBits.Administrator
        )
    );
}

function isStaff(member) {
    if (!member) return false;

    if (
        member.permissions.has(
            PermissionFlagsBits.Administrator
        )
    ) {
        return true;
    }

    const cfg = getGuildConfig(member.guild.id);

    return cfg.staffRoleId
        ? member.roles.cache.has(cfg.staffRoleId)
        : false;
}

function safeName(name, fallback = "server") {
    const result = String(name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .substring(0, 60);

    return result || fallback;
}

function extractInviteCode(invite) {
    if (!invite) return null;

    const value = invite.trim();

    const match = value.match(
        /(?:discord\.gg\/|discord(?:app)?\.com\/invite\/)([A-Za-z0-9-]+)/
    );

    return match ? match[1] : null;
}

function normaliseInvite(invite) {
    const code = extractInviteCode(invite);

    if (!code) return null;

    return `https://discord.gg/${code}`;
}

async function getBotWebhook(channel, name) {
    if (
        !channel ||
        channel.type !== ChannelType.GuildText
    ) {
        return null;
    }

    const webhooks =
        await channel.fetchWebhooks();

    let webhook = webhooks.find(
        hook =>
            hook.owner?.id === client.user.id
    );

    if (!webhook) {
        webhook = await channel.createWebhook({
            name
        });
    }

    return webhook;
}

// ============================================================
// COMMANDS
// ============================================================

const commands = [

    // GENERAL
    new SlashCommandBuilder()
        .setName("help")
        .setDescription("Shows all available commands"),

    new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Checks the bot latency"),

    new SlashCommandBuilder()
        .setName("botinfo")
        .setDescription("Shows bot information"),

    new SlashCommandBuilder()
        .setName("serverinfo")
        .setDescription("Shows server information"),

    new SlashCommandBuilder()
        .setName("userinfo")
        .setDescription("Shows information about a user")
        .addUserOption(o =>
            o.setName("user")
                .setDescription("User")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("profile")
        .setDescription("Shows your profile"),

    // MODERATION
    new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Ban a member")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.BanMembers
        )
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
        .setDescription("Kick a member")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.KickMembers
        )
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
        .setDescription("Timeout a member")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ModerateMembers
        )
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
        .setDescription("Remove a timeout")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ModerateMembers
        )
        .addUserOption(o =>
            o.setName("user")
                .setDescription("Member")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("warn")
        .setDescription("Warn a member")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ModerateMembers
        )
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
        .setDescription("View warnings")
        .addUserOption(o =>
            o.setName("user")
                .setDescription("Member")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("clearwarnings")
        .setDescription("Clear warnings")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ModerateMembers
        )
        .addUserOption(o =>
            o.setName("user")
                .setDescription("Member")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("purge")
        .setDescription("Delete messages")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageMessages
        )
        .addIntegerOption(o =>
            o.setName("amount")
                .setDescription("Amount")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        ),

    // MANAGEMENT
    new SlashCommandBuilder()
        .setName("lock")
        .setDescription("Lock the current channel")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageChannels
        ),

    new SlashCommandBuilder()
        .setName("unlock")
        .setDescription("Unlock the current channel")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageChannels
        ),

    new SlashCommandBuilder()
        .setName("slowmode")
        .setDescription("Set channel slowmode")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageChannels
        )
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
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageRoles
        )
        .addSubcommand(s =>
            s.setName("add")
                .setDescription("Add a role")
                .addUserOption(o =>
                    o.setName("user")
                        .setDescription("Member")
                        .setRequired(true)
                )
                .addRoleOption(o =>
                    o.setName("role")
                        .setDescription("Role")
                        .setRequired(true)
                )
        )
        .addSubcommand(s =>
            s.setName("remove")
                .setDescription("Remove a role")
                .addUserOption(o =>
                    o.setName("user")
                        .setDescription("Member")
                        .setRequired(true)
                )
                .addRoleOption(o =>
                    o.setName("role")
                        .setDescription("Role")
                        .setRequired(true)
                )
        ),

    new SlashCommandBuilder()
        .setName("announce")
        .setDescription("Send an announcement")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        )
        .addStringOption(o =>
            o.setName("message")
                .setDescription("Announcement")
                .setRequired(true)
        ),

    // WEBHOOK EMBED
    new SlashCommandBuilder()
        .setName("embed")
        .setDescription("Create a webhook embed"),

    // TICKETS
    new SlashCommandBuilder()
        .setName("ticketconfig")
        .setDescription("Configure tickets")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        ),

    // SUBMISSIONS
    new SlashCommandBuilder()
        .setName("submitconfig")
        .setDescription("Configure server submissions")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        ),

    // REPORTS
    new SlashCommandBuilder()
        .setName("reportsetup")
        .setDescription("Configure server reports")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        ),

    // VERIFICATION
    new SlashCommandBuilder()
        .setName("verification")
        .setDescription("Configure the verification system")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        )

].map(command => command.toJSON());

// ============================================================
// REGISTER
// ============================================================

async function registerCommands() {
    try {
        const rest = new REST({ version: "10" })
            .setToken(TOKEN);

        await rest.put(
            Routes.applicationGuildCommands(
                CLIENT_ID,
                GUILD_ID
            ),
            {
                body: commands
            }
        );

        console.log(
            `Registered ${commands.length} slash commands.`
        );
    } catch (error) {
        console.error(
            "Command registration error:",
            error
        );
    }
}

// ============================================================
// READY
// ============================================================

client.once("ready", async () => {
    console.log(
        `Logged in as ${client.user.tag}`
    );

    console.log(
        `Serving ${client.guilds.cache.size} server(s).`
    );

    await registerCommands();

    client.user.setActivity(
        "server listings",
        {
            type: 3
        }
    );
});

// ============================================================
// HELP
// ============================================================

function helpEmbed() {
    return createEmbed(
        "Commands",
        "Here are the commands available."
    ).addFields(
        {
            name: "General",
            value:
                "`/help`\n" +
                "`/ping`\n" +
                "`/botinfo`\n" +
                "`/serverinfo`\n" +
                "`/userinfo`\n" +
                "`/profile`"
        },
        {
            name: "Moderation",
            value:
                "`/ban`\n" +
                "`/kick`\n" +
                "`/timeout`\n" +
                "`/untimeout`\n" +
                "`/warn`\n" +
                "`/warnings`\n" +
                "`/clearwarnings`\n" +
                "`/purge`"
        },
        {
            name: "Management",
            value:
                "`/lock`\n" +
                "`/unlock`\n" +
                "`/slowmode`\n" +
                "`/role`\n" +
                "`/announce`\n" +
                "`/embed`"
        },
        {
            name: "Systems",
            value:
                "`/ticketconfig`\n" +
                "`/submitconfig`\n" +
                "`/reportsetup`\n" +
                "`/verification`"
        }
    );
}

// ============================================================
// COMMAND HANDLER
// ============================================================

client.on(
    "interactionCreate",
    async interaction => {

        try {

            // ====================================================
            // SLASH COMMANDS
            // ====================================================

            if (interaction.isChatInputCommand()) {

                const command =
                    interaction.commandName;

                // HELP
                if (command === "help") {
                    return interaction.reply({
                        embeds: [helpEmbed()],
                        ephemeral: true
                    });
                }

                // PING
                if (command === "ping") {
                    return interaction.reply({
                        content:
                            `Pong! ${client.ws.ping}ms`,
                        ephemeral: true
                    });
                }

                // BOT INFO
                if (command === "botinfo") {
                    return interaction.reply({
                        embeds: [
                            createEmbed(
                                "Bot Information",
                                `**Bot:** ${client.user.tag}\n` +
                                `**Servers:** ${client.guilds.cache.size}\n` +
                                `**Discord.js:** v14`
                            )
                        ]
                    });
                }

                // SERVER INFO
                if (command === "serverinfo") {

                    const guild =
                        interaction.guild;

                    return interaction.reply({
                        embeds: [
                            createEmbed(
                                guild.name,
                                `**Owner:** <@${guild.ownerId}>\n` +
                                `**Members:** ${guild.memberCount}\n` +
                                `**Channels:** ${guild.channels.cache.size}\n` +
                                `**Roles:** ${guild.roles.cache.size}`
                            )
                        ]
                    });
                }

                // USER INFO
                if (command === "userinfo") {

                    const user =
                        interaction.options.getUser(
                            "user"
                        ) ||
                        interaction.user;

                    const member =
                        await interaction.guild.members
                            .fetch(user.id)
                            .catch(() => null);

                    const embed =
                        createEmbed(
                            "User Information",
                            `**Username:** ${user.tag}\n` +
                            `**ID:** ${user.id}\n` +
                            `**Created:** <t:${Math.floor(
                                user.createdTimestamp / 1000
                            )}:F>`
                        );

                    if (member?.joinedTimestamp) {
                        embed.addFields({
                            name: "Joined Server",
                            value:
                                `<t:${Math.floor(
                                    member.joinedTimestamp / 1000
                                )}:F>`
                        });
                    }

                    embed.setThumbnail(
                        user.displayAvatarURL()
                    );

                    return interaction.reply({
                        embeds: [embed]
                    });
                }

                // PROFILE
                if (command === "profile") {

                    const member =
                        interaction.member;

                    return interaction.reply({
                        embeds: [
                            createEmbed(
                                `${interaction.user.username}'s Profile`,
                                `**Username:** ${interaction.user.tag}\n` +
                                `**Joined:** <t:${Math.floor(
                                    member.joinedTimestamp / 1000
                                )}:R>\n\n` +
                                `**Roles:** ${
                                    member.roles.cache
                                        .filter(
                                            r =>
                                                r.id !==
                                                interaction.guild.id
                                        )
                                        .map(r => r.toString())
                                        .join(", ") ||
                                    "None"
                                }`
                            ).setThumbnail(
                                interaction.user.displayAvatarURL()
                            )
                        ]
                    });
                }

                // BAN
                if (command === "ban") {

                    const user =
                        interaction.options.getUser("user");

                    const reason =
                        interaction.options.getString("reason") ||
                        "No reason provided";

                    const member =
                        await interaction.guild.members
                            .fetch(user.id)
                            .catch(() => null);

                    if (!member) {
                        return interaction.reply({
                            content:
                                "That member is not in this server.",
                            ephemeral: true
                        });
                    }

                    await member.ban({ reason });

                    return interaction.reply({
                        content:
                            `Banned **${user.tag}**.\nReason: ${reason}`
                    });
                }

                // KICK
                if (command === "kick") {

                    const user =
                        interaction.options.getUser("user");

                    const reason =
                        interaction.options.getString("reason") ||
                        "No reason provided";

                    const member =
                        await interaction.guild.members
                            .fetch(user.id)
                            .catch(() => null);

                    if (!member) {
                        return interaction.reply({
                            content:
                                "That member is not in this server.",
                            ephemeral: true
                        });
                    }

                    await member.kick(reason);

                    return interaction.reply({
                        content:
                            `Kicked **${user.tag}**.\nReason: ${reason}`
                    });
                }

                // TIMEOUT
                if (command === "timeout") {

                    const user =
                        interaction.options.getUser("user");

                    const minutes =
                        interaction.options.getInteger("minutes");

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

                    return interaction.reply({
                        content:
                            `Timed out **${user.tag}** for ${minutes} minute(s).`
                    });
                }

                // UNTIMEOUT
                if (command === "untimeout") {

                    const user =
                        interaction.options.getUser("user");

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

                    return interaction.reply({
                        content:
                            `Removed timeout from **${user.tag}**.`
                    });
                }

                // WARN
                if (command === "warn") {

                    const user =
                        interaction.options.getUser("user");

                    const reason =
                        interaction.options.getString("reason");

                    if (!warnings[interaction.guild.id]) {
                        warnings[interaction.guild.id] = {};
                    }

                    if (
                        !warnings[interaction.guild.id][user.id]
                    ) {
                        warnings[interaction.guild.id][user.id] = [];
                    }

                    warnings[
                        interaction.guild.id
                    ][user.id].push({
                        reason,
                        moderator: interaction.user.id,
                        timestamp: Date.now()
                    });

                    saveJSON(
                        warningsFile,
                        warnings
                    );

                    return interaction.reply({
                        content:
                            `Warned **${user.tag}**.\nReason: ${reason}`
                    });
                }

                // WARNINGS
                if (command === "warnings") {

                    const user =
                        interaction.options.getUser("user") ||
                        interaction.user;

                    const list =
                        warnings[
                            interaction.guild.id
                        ]?.[user.id] || [];

                    if (!list.length) {
                        return interaction.reply({
                            content:
                                `**${user.tag}** has no warnings.`,
                            ephemeral: true
                        });
                    }

                    return interaction.reply({
                        embeds: [
                            createEmbed(
                                `Warnings — ${user.tag}`,
                                list
                                    .map(
                                        (w, i) =>
                                            `**${i + 1}.** ${w.reason} — <@${w.moderator}>`
                                    )
                                    .join("\n")
                            )
                        ]
                    });
                }

                // CLEAR WARNINGS
                if (command === "clearwarnings") {

                    const user =
                        interaction.options.getUser("user");

                    if (warnings[interaction.guild.id]) {
                        delete warnings[
                            interaction.guild.id
                        ][user.id];
                    }

                    saveJSON(
                        warningsFile,
                        warnings
                    );

                    return interaction.reply({
                        content:
                            `Cleared warnings for **${user.tag}**.`
                    });
                }

                // PURGE
                if (command === "purge") {

                    const amount =
                        interaction.options.getInteger("amount");

                    const deleted =
                        await interaction.channel.bulkDelete(
                            amount,
                            true
                        );

                    return interaction.reply({
                        content:
                            `Deleted ${deleted.size} message(s).`,
                        ephemeral: true
                    });
                }

                // LOCK
                if (command === "lock") {

                    await interaction.channel
                        .permissionOverwrites.edit(
                            interaction.guild.roles.everyone,
                            { SendMessages: false }
                        );

                    return interaction.reply({
                        content: "Channel locked."
                    });
                }

                // UNLOCK
                if (command === "unlock") {

                    await interaction.channel
                        .permissionOverwrites.edit(
                            interaction.guild.roles.everyone,
                            { SendMessages: null }
                        );

                    return interaction.reply({
                        content: "Channel unlocked."
                    });
                }

                // SLOWMODE
                if (command === "slowmode") {

                    const seconds =
                        interaction.options.getInteger("seconds");

                    await interaction.channel.setRateLimitPerUser(
                        seconds
                    );

                    return interaction.reply({
                        content:
                            seconds === 0
                                ? "Slowmode disabled."
                                : `Slowmode set to ${seconds} seconds.`
                    });
                }

                // ROLE
                if (command === "role") {

                    const sub =
                        interaction.options.getSubcommand();

                    const member =
                        interaction.options.getMember("user");

                    const role =
                        interaction.options.getRole("role");

                    if (
                        role.position >=
                        interaction.member.roles.highest.position
                    ) {
                        return interaction.reply({
                            content:
                                "You cannot manage that role.",
                            ephemeral: true
                        });
                    }

                    if (sub === "add") {
                        await member.roles.add(role);

                        return interaction.reply({
                            content:
                                `Added ${role} to **${member.user.tag}**.`
                        });
                    }

                    await member.roles.remove(role);

                    return interaction.reply({
                        content:
                            `Removed ${role} from **${member.user.tag}**.`
                    });
                }

                // ANNOUNCE
                if (command === "announce") {

                    const message =
                        interaction.options.getString("message");

                    return interaction.reply({
                        embeds: [
                            createEmbed(
                                "Announcement",
                                message
                            ).setFooter({
                                text:
                                    `Posted by ${interaction.user.tag}`
                            })
                        ]
                    });
                }

                // EMBED
                if (command === "embed") {

                    return showEmbedBuilder(
                        interaction
                    );
                }

                // TICKET CONFIG
                if (command === "ticketconfig") {

                    if (!canManage(interaction.member)) {
                        return interaction.reply({
                            content:
                                "You need Manage Server permissions.",
                            ephemeral: true
                        });
                    }

                    return sendTicketConfigPanel(
                        interaction
                    );
                }

                // SUBMIT CONFIG
                if (command === "submitconfig") {

                    if (!canManage(interaction.member)) {
                        return interaction.reply({
                            content:
                                "You need Manage Server permissions.",
                            ephemeral: true
                        });
                    }

                    return sendSubmitConfigPanel(
                        interaction
                    );
                }

                // REPORT SETUP
                if (command === "reportsetup") {

                    if (!canManage(interaction.member)) {
                        return interaction.reply({
                            content:
                                "You need Manage Server permissions.",
                            ephemeral: true
                        });
                    }

                    return sendReportConfigPanel(
                        interaction
                    );
                }

                // VERIFICATION
                if (command === "verification") {

                    if (!canManage(interaction.member)) {
                        return interaction.reply({
                            content:
                                "You need Manage Server permissions.",
                            ephemeral: true
                        });
                    }

                    return sendVerificationPanel(
                        interaction
                    );
                }
            }

            // ====================================================
            // BUTTONS
            // ====================================================

            if (interaction.isButton()) {

                // EMBED BUILDER
                if (
                    interaction.customId ===
                    "embed_open"
                ) {
                    return showEmbedBuilder(
                        interaction
                    );
                }

                if (
                    interaction.customId ===
                    "embed_edit"
                ) {
                    return showEmbedModal(
                        interaction
                    );
                }

                if (
                    interaction.customId ===
                    "embed_send"
                ) {

                    const draft =
                        interaction.client.embedDrafts?.get(
                            interaction.user.id
                        );

                    if (!draft) {
                        return interaction.reply({
                            content:
                                "There is no embed ready to send. Use Edit Embed first.",
                            ephemeral: true
                        });
                    }

                    const channel =
                        interaction.guild.channels.cache.get(
                            draft.channelId
                        );

                    if (!channel) {
                        return interaction.reply({
                            content:
                                "The selected channel no longer exists.",
                            ephemeral: true
                        });
                    }

                    const webhook =
                        await getBotWebhook(
                            channel,
                            draft.webhookName ||
                            "Server Listings"
                        );

                    if (!webhook) {
                        return interaction.reply({
                            content:
                                "I couldn't create the webhook.",
                            ephemeral: true
                        });
                    }

                    const embed =
                        new EmbedBuilder()
                            .setColor(BRAND_COLOUR)
                            .setTitle(
                                draft.title
                            )
                            .setDescription(
                                draft.description
                            )
                            .setTimestamp();

                    if (draft.footer) {
                        embed.setFooter({
                            text: draft.footer
                        });
                    }

                    const components = [];

                    if (draft.buttonLabel && draft.buttonUrl) {
                        components.push(
                            new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setLabel(
                                            draft.buttonLabel
                                        )
                                        .setStyle(
                                            ButtonStyle.Link
                                        )
                                        .setURL(
                                            draft.buttonUrl
                                        )
                                )
                        );
                    }

                    await webhook.send({
                        username:
                            draft.webhookName ||
                            "Server Listings",
                        avatarURL:
                            client.user.displayAvatarURL(),
                        embeds: [embed],
                        components
                    });

                    interaction.client.embedDrafts.delete(
                        interaction.user.id
                    );

                    return interaction.update({
                        embeds: [
                            createEmbed(
                                "Embed Sent",
                                `Your webhook embed has been sent to ${channel}.`
                            )
                        ],
                        components: []
                    });
                }

                if (
                    interaction.customId ===
                    "embed_cancel"
                ) {
                    if (interaction.client.embedDrafts) {
                        interaction.client.embedDrafts.delete(
                            interaction.user.id
                        );
                    }

                    return interaction.update({
                        content: "Embed builder closed.",
                        embeds: [],
                        components: []
                    });
                }

                // OPEN TICKET
                if (
                    interaction.customId ===
                    "open_ticket"
                ) {

                    const cfg =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    if (!cfg.ticketStaffRoleId) {
                        return interaction.reply({
                            content:
                                "The ticket system has not been configured.",
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
                            content:
                                `You already have a ticket: ${existing}`,
                            ephemeral: true
                        });
                    }

                    const staffRole =
                        interaction.guild.roles.cache.get(
                            cfg.ticketStaffRoleId
                        );

                    if (!staffRole) {
                        return interaction.reply({
                            content:
                                "The ticket staff role no longer exists.",
                            ephemeral: true
                        });
                    }

                    const channel =
                        await interaction.guild.channels.create({
                            name:
                                `ticket-${safeName(
                                    interaction.user.username
                                )}`,
                            type:
                                ChannelType.GuildText,
                            parent:
                                cfg.ticketCategoryId ||
                                undefined,
                            topic:
                                `ticket-owner:${interaction.user.id}`,
                            permissionOverwrites: [
                                {
                                    id:
                                        interaction.guild.roles.everyone.id,
                                    deny: [
                                        PermissionFlagsBits.ViewChannel
                                    ]
                                },
                                {
                                    id:
                                        interaction.user.id,
                                    allow: [
                                        PermissionFlagsBits.ViewChannel,
                                        PermissionFlagsBits.SendMessages,
                                        PermissionFlagsBits.ReadMessageHistory
                                    ]
                                },
                                {
                                    id:
                                        staffRole.id,
                                    allow: [
                                        PermissionFlagsBits.ViewChannel,
                                        PermissionFlagsBits.SendMessages,
                                        PermissionFlagsBits.ReadMessageHistory,
                                        PermissionFlagsBits.ManageMessages
                                    ]
                                },
                                {
                                    id:
                                        client.user.id,
                                    allow: [
                                        PermissionFlagsBits.ViewChannel,
                                        PermissionFlagsBits.SendMessages,
                                        PermissionFlagsBits.ReadMessageHistory,
                                        PermissionFlagsBits.ManageChannels
                                    ]
                                }
                            ]
                        });

                    await channel.send({
                        content:
                            `${staffRole} ${interaction.user}`,
                        embeds: [
                            createEmbed(
                                "Support Ticket",
                                `Welcome ${interaction.user}!\n\nPlease explain what you need help with.`
                            )
                        ],
                        components: [
                            new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setCustomId(
                                            "claim_ticket"
                                        )
                                        .setLabel("Claim")
                                        .setStyle(
                                            ButtonStyle.Primary
                                        ),
                                    new ButtonBuilder()
                                        .setCustomId(
                                            "close_ticket"
                                        )
                                        .setLabel("Close")
                                        .setStyle(
                                            ButtonStyle.Danger
                                        )
                                )
                        ]
                    });

                    return interaction.reply({
                        content:
                            `Your ticket has been created: ${channel}`,
                        ephemeral: true
                    });
                }

                // CLAIM
                if (
                    interaction.customId ===
                    "claim_ticket"
                ) {

                    if (!isStaff(interaction.member)) {
                        return interaction.reply({
                            content:
                                "Only staff can claim tickets.",
                            ephemeral: true
                        });
                    }

                    return interaction.reply({
                        embeds: [
                            createEmbed(
                                "Ticket Claimed",
                                `This ticket has been claimed by ${interaction.user}.`
                            )
                        ]
                    });
                }

                // CLOSE
                if (
                    interaction.customId ===
                    "close_ticket"
                ) {

                    if (!isStaff(interaction.member)) {
                        return interaction.reply({
                            content:
                                "Only staff can close tickets.",
                            ephemeral: true
                        });
                    }

                    const cfg =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    if (cfg.ticketLogChannelId) {
                        const log =
                            interaction.guild.channels.cache.get(
                                cfg.ticketLogChannelId
                            );

                        if (log) {
                            await log.send({
                                embeds: [
                                    createEmbed(
                                        "Ticket Closed",
                                        `**Channel:** ${interaction.channel.name}\n` +
                                        `**Closed by:** ${interaction.user}\n` +
                                        `**Time:** <t:${Math.floor(
                                            Date.now() / 1000
                                        )}:F>`
                                    )
                                ]
                            }).catch(() => {});
                        }
                    }

                    await interaction.reply({
                        embeds: [
                            createEmbed(
                                "Ticket Closed",
                                `This ticket will be deleted in 5 seconds.\n\nClosed by ${interaction.user}.`
                            )
                        ]
                    });

                    setTimeout(() => {
                        interaction.channel
                            .delete()
                            .catch(() => {});
                    }, 5000);

                    return;
                }

                // SUBMIT SERVER
                if (
                    interaction.customId ===
                    "submit_server"
                ) {

                    const cfg =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    if (!cfg.submitStaffRoleId) {
                        return interaction.reply({
                            content:
                                "The submission system has not been configured.",
                            ephemeral: true
                        });
                    }

                    const modal =
                        new ModalBuilder()
                            .setCustomId(
                                "server_submission_modal"
                            )
                            .setTitle(
                                "Submit Your Server"
                            );

                    modal.addComponents(
                        new ActionRowBuilder()
                            .addComponents(
                                new TextInputBuilder()
                                    .setCustomId(
                                        "server_name"
                                    )
                                    .setLabel(
                                        "Server Name"
                                    )
                                    .setStyle(
                                        TextInputStyle.Short
                                    )
                                    .setRequired(true)
                                    .setMaxLength(100)
                            ),
                        new ActionRowBuilder()
                            .addComponents(
                                new TextInputBuilder()
                                    .setCustomId(
                                        "server_description"
                                    )
                                    .setLabel(
                                        "Server Description"
                                    )
                                    .setStyle(
                                        TextInputStyle.Paragraph
                                    )
                                    .setRequired(true)
                                    .setMaxLength(1000)
                            ),
                        new ActionRowBuilder()
                            .addComponents(
                                new TextInputBuilder()
                                    .setCustomId(
                                        "server_invite"
                                    )
                                    .setLabel(
                                        "Discord Invite"
                                    )
                                    .setStyle(
                                        TextInputStyle.Short
                                    )
                                    .setRequired(true)
                                    .setPlaceholder(
                                        "https://discord.gg/example"
                                    )
                            ),
                        new ActionRowBuilder()
                            .addComponents(
                                new TextInputBuilder()
                                    .setCustomId(
                                        "server_category"
                                    )
                                    .setLabel(
                                        "Server Category"
                                    )
                                    .setStyle(
                                        TextInputStyle.Short
                                    )
                                    .setRequired(true)
                            ),
                        new ActionRowBuilder()
                            .addComponents(
                                new TextInputBuilder()
                                    .setCustomId(
                                        "server_owner"
                                    )
                                    .setLabel(
                                        "Your Role"
                                    )
                                    .setStyle(
                                        TextInputStyle.Short
                                    )
                                    .setRequired(true)
                            )
                    );

                    return interaction.showModal(
                        modal
                    );
                }

                // ACCEPT SUBMISSION
                if (
                    interaction.customId.startsWith(
                        "submission_accept_"
                    )
                ) {

                    if (!isStaff(interaction.member)) {
                        return interaction.reply({
                            content:
                                "Only staff can approve submissions.",
                            ephemeral: true
                        });
                    }

                    await interaction.deferReply({
                        ephemeral: true
                    });

                    const id =
                        interaction.customId.replace(
                            "submission_accept_",
                            ""
                        );

                    const submission =
                        submissions.get(id);

                    if (!submission) {
                        return interaction.editReply(
                            "This submission is no longer available."
                        );
                    }

                    const cfg =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    const communityChannel =
                        interaction.guild.channels.cache.get(
                            cfg.verifiedChannelId
                        );

                    if (!communityChannel) {
                        return interaction.editReply(
                            "The community/verified server channel has not been configured."
                        );
                    }

                    // Give verified role
                    if (cfg.verifiedRoleId) {

                        const member =
                            await interaction.guild.members
                                .fetch(
                                    submission.userId
                                )
                                .catch(() => null);

                        const role =
                            interaction.guild.roles.cache.get(
                                cfg.verifiedRoleId
                            );

                        if (member && role) {
                            await member.roles
                                .add(role)
                                .catch(() => {});
                        }
                    }

                    const invite =
                        normaliseInvite(
                            submission.invite
                        );

                    if (!invite) {
                        return interaction.editReply(
                            "The submitted Discord invite is invalid."
                        );
                    }

                    // IMPORTANT:
                    // WEBHOOK NAME IS ALWAYS "Server Listing"
                    const webhook =
                        await getBotWebhook(
                            communityChannel,
                            "Server Listing"
                        );

                    if (!webhook) {
                        return interaction.editReply(
                            "I could not create the listing webhook."
                        );
                    }

                    // IMPORTANT:
                    // INVITE IS NOT PUT INSIDE THE EMBED
                    const listing =
                        new EmbedBuilder()
                            .setColor(
                                BRAND_COLOUR
                            )
                            .setTitle(
                                `${LOGO} ${submission.serverName}`
                            )
                            .setDescription(
                                submission.description
                            )
                            .addFields(
                                {
                                    name: "Category",
                                    value:
                                        submission.category,
                                    inline: true
                                },
                                {
                                    name: "Server Owner",
                                    value:
                                        `<@${submission.userId}>`,
                                    inline: true
                                }
                            )
                            .setFooter({
                                text:
                                    "Server Listing"
                            })
                            .setTimestamp();

                    // JOIN BUTTON UNDER EMBED
                    const joinRow =
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setLabel(
                                        "Join Server!"
                                    )
                                    .setStyle(
                                        ButtonStyle.Link
                                    )
                                    .setURL(
                                        invite
                                    )
                            );

                    await webhook.send({
                        username:
                            "Server Listing",
                        avatarURL:
                            client.user.displayAvatarURL(),
                        embeds: [
                            listing
                        ],
                        components: [
                            joinRow
                        ]
                    });

                    // DM USER
                    const applicant =
                        await client.users
                            .fetch(
                                submission.userId
                            )
                            .catch(() => null);

                    if (applicant) {
                        await applicant.send({
                            embeds: [
                                createEmbed(
                                    "Server Approved",
                                    `Your server **${submission.serverName}** has been approved and is now listed in the verified server channel.`
                                )
                            ]
                        }).catch(() => {});
                    }

                    // Mark review message approved
                    await interaction.message
                        .edit({
                            components: [
                                new ActionRowBuilder()
                                    .addComponents(
                                        new ButtonBuilder()
                                            .setCustomId(
                                                "submission_done"
                                            )
                                            .setLabel(
                                                "Approved"
                                            )
                                            .setStyle(
                                                ButtonStyle.Success
                                            )
                                            .setDisabled(
                                                true
                                            )
                                    )
                            ]
                        })
                        .catch(() => {});

                    // Remove submission from memory
                    submissions.delete(id);

                    await interaction.editReply(
                        "The server has been approved and posted to the community channel. The review channel will now close."
                    );

                    // DELETE REVIEW CHANNEL
                    setTimeout(() => {
                        interaction.channel
                            .delete()
                            .catch(() => {});
                    }, 3000);

                    return;
                }

                // DENY SUBMISSION
                if (
                    interaction.customId.startsWith(
                        "submission_deny_"
                    )
                ) {

                    if (!isStaff(interaction.member)) {
                        return interaction.reply({
                            content:
                                "Only staff can deny submissions.",
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
                            content:
                                "This submission is no longer available.",
                            ephemeral: true
                        });
                    }

                    const modal =
                        new ModalBuilder()
                            .setCustomId(
                                `submission_deny_modal_${id}`
                            )
                            .setTitle(
                                "Deny Submission"
                            );

                    modal.addComponents(
                        new ActionRowBuilder()
                            .addComponents(
                                new TextInputBuilder()
                                    .setCustomId(
                                        "deny_reason"
                                    )
                                    .setLabel(
                                        "Reason for denial"
                                    )
                                    .setStyle(
                                        TextInputStyle.Paragraph
                                    )
                                    .setRequired(true)
                                    .setMaxLength(1000)
                            )
                    );

                    return interaction.showModal(
                        modal
                    );
                }

                // REPORT SERVER
                if (
                    interaction.customId ===
                    "report_server"
                ) {

                    const cfg =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    if (!cfg.reportStaffRoleId) {
                        return interaction.reply({
                            content:
                                "The server report system has not been configured.",
                            ephemeral: true
                        });
                    }

                    const modal =
                        new ModalBuilder()
                            .setCustomId(
                                "server_report_modal"
                            )
                            .setTitle(
                                "Report a Server"
                            );

                    modal.addComponents(
                        new ActionRowBuilder()
                            .addComponents(
                                new TextInputBuilder()
                                    .setCustomId(
                                        "reported_server"
                                    )
                                    .setLabel(
                                        "Server name / invite"
                                    )
                                    .setStyle(
                                        TextInputStyle.Short
                                    )
                                    .setRequired(true)
                            ),
                        new ActionRowBuilder()
                            .addComponents(
                                new TextInputBuilder()
                                    .setCustomId(
                                        "report_reason"
                                    )
                                    .setLabel(
                                        "Reason for report"
                                    )
                                    .setStyle(
                                        TextInputStyle.Paragraph
                                    )
                                    .setRequired(true)
                                    .setMaxLength(1000)
                            )
                    );

                    return interaction.showModal(
                        modal
                    );
                }

                // REPORT CLOSE
                if (
                    interaction.customId.startsWith(
                        "close_report_"
                    )
                ) {

                    if (!isStaff(interaction.member)) {
                        return interaction.reply({
                            content:
                                "Only staff can close reports.",
                            ephemeral: true
                        });
                    }

                    await interaction.reply({
                        embeds: [
                            createEmbed(
                                "Report Closed",
                                `This report was closed by ${interaction.user}.`
                            )
                        ]
                    });

                    setTimeout(() => {
                        interaction.channel
                            .delete()
                            .catch(() => {});
                    }, 3000);

                    return;
                }

                // CONFIG PANELS
                if (
                    interaction.customId ===
                    "ticket_set_staff"
                ) {
                    return roleSelect(
                        interaction,
                        "ticket_staff_select",
                        "Select the ticket staff role."
                    );
                }

                if (
                    interaction.customId ===
                    "ticket_set_category"
                ) {
                    return categorySelect(
                        interaction,
                        "ticket_category_select",
                        "Select the ticket category."
                    );
                }

                if (
                    interaction.customId ===
                    "ticket_set_logs"
                ) {
                    return channelSelect(
                        interaction,
                        "ticket_logs_select",
                        "Select the ticket log channel."
                    );
                }

                if (
                    interaction.customId ===
                    "ticket_send_panel"
                ) {

                    await interaction.channel.send({
                        embeds: [
                            createEmbed(
                                "Support Tickets",
                                "Need help? Open a ticket below and a member of staff will assist you."
                            )
                        ],
                        components: [
                            new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setCustomId(
                                            "open_ticket"
                                        )
                                        .setLabel(
                                            "Open Ticket"
                                        )
                                        .setStyle(
                                            ButtonStyle.Primary
                                        )
                                )
                        ]
                    });

                    return interaction.reply({
                        content:
                            "Ticket panel sent.",
                        ephemeral: true
                    });
                }

                if (
                    interaction.customId ===
                    "ticket_refresh"
                ) {
                    return sendTicketConfigPanel(
                        interaction,
                        true
                    );
                }

                if (
                    interaction.customId ===
                    "submit_set_staff"
                ) {
                    return roleSelect(
                        interaction,
                        "submit_staff_select",
                        "Select the submission staff role."
                    );
                }

                if (
                    interaction.customId ===
                    "submit_set_review"
                ) {
                    return categorySelect(
                        interaction,
                        "submit_review_select",
                        "Select the submission review category."
                    );
                }

                if (
                    interaction.customId ===
                    "submit_set_verified"
                ) {
                    return channelSelect(
                        interaction,
                        "submit_verified_select",
                        "Select the community/verified server channel."
                    );
                }

                if (
                    interaction.customId ===
                    "submit_set_verified_role"
                ) {
                    return roleSelect(
                        interaction,
                        "submit_verified_role_select",
                        "Select the verified role."
                    );
                }

                if (
                    interaction.customId ===
                    "submit_send_panel"
                ) {

                    await interaction.channel.send({
                        embeds: [
                            createEmbed(
                                "Submit Your Server",
                                "Want your server featured in our verified server listings?\n\nClick below to submit your server.\n\nAll submissions are manually reviewed."
                            )
                        ],
                        components: [
                            new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setCustomId(
                                            "submit_server"
                                        )
                                        .setLabel(
                                            "Submit Server"
                                        )
                                        .setStyle(
                                            ButtonStyle.Primary
                                        )
                                ]
                        ]
                    });

                    return interaction.reply({
                        content:
                            "Submission panel sent.",
                        ephemeral: true
                    });
                }

                if (
                    interaction.customId ===
                    "submit_refresh"
                ) {
                    return sendSubmitConfigPanel(
                        interaction,
                        true
                    );
                }

                // REPORT CONFIG
                if (
                    interaction.customId ===
                    "report_set_staff"
                ) {
                    return roleSelect(
                        interaction,
                        "report_staff_select",
                        "Select the report staff role."
                    );
                }

                if (
                    interaction.customId ===
                    "report_set_category"
                ) {
                    return categorySelect(
                        interaction,
                        "report_category_select",
                        "Select the report category."
                    );
                }

                if (
                    interaction.customId ===
                    "report_send_panel"
                ) {

                    await interaction.channel.send({
                        embeds: [
                            createEmbed(
                                "Report a Server",
                                "Seen a server that breaks the rules?\n\nUse the button below to submit a report to our staff team."
                            )
                        ],
                        components: [
                            new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setCustomId(
                                            "report_server"
                                        )
                                        .setLabel(
                                            "Report Server"
                                        )
                                        .setStyle(
                                            ButtonStyle.Danger
                                        )
                                ]
                        ]
                    });

                    return interaction.reply({
                        content:
                            "Report panel sent.",
                        ephemeral: true
                    });
                }

                if (
                    interaction.customId ===
                    "report_refresh"
                ) {
                    return sendReportConfigPanel(
                        interaction,
                        true
                    );
                }

                // VERIFICATION
                if (
                    interaction.customId ===
                    "verification_set_role"
                ) {
                    return roleSelect(
                        interaction,
                        "verification_role_select",
                        "Select the verification role."
                    );
                }

                if (
                    interaction.customId ===
                    "verification_send_panel"
                ) {

                    await interaction.channel.send({
                        embeds: [
                            createEmbed(
                                "Verification",
                                "Click the button below to verify yourself."
                            )
                        ],
                        components: [
                            new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setCustomId(
                                            "verify_member"
                                        )
                                        .setLabel(
                                            "Verify"
                                        )
                                        .setStyle(
                                            ButtonStyle.Success
                                        )
                                )
                        ]
                    });

                    return interaction.reply({
                        content:
                            "Verification panel sent.",
                        ephemeral: true
                    });
                }

                if (
                    interaction.customId ===
                    "verification_refresh"
                ) {
                    return sendVerificationPanel(
                        interaction,
                        true
                    );
                }

                // VERIFY
                if (
                    interaction.customId ===
                    "verify_member"
                ) {

                    const cfg =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    const role =
                        interaction.guild.roles.cache.get(
                            cfg.verificationRoleId
                        );

                    if (!role) {
                        return interaction.reply({
                            content:
                                "Verification has not been configured.",
                            ephemeral: true
                        });
                    }

                    if (
                        interaction.member.roles.cache.has(
                            role.id
                        )
                    ) {
                        return interaction.reply({
                            content:
                                "You are already verified.",
                            ephemeral: true
                        });
                    }

                    await interaction.member.roles.add(
                        role
                    );

                    return interaction.reply({
                        content:
                            "You have been successfully verified!",
                        ephemeral: true
                    });
                }
            }

            // ====================================================
            // SELECT MENUS
            // ====================================================

            if (interaction.isStringSelectMenu()) {

                const guildId =
                    interaction.guild.id;

                const cfg =
                    getGuildConfig(guildId);

                const value =
                    interaction.values[0];

                switch (interaction.customId) {

                    case "ticket_staff_select":
                        cfg.ticketStaffRoleId = value;
                        break;

                    case "ticket_category_select":
                        cfg.ticketCategoryId = value;
                        break;

                    case "ticket_logs_select":
                        cfg.ticketLogChannelId = value;
                        break;

                    case "submit_staff_select":
                        cfg.submitStaffRoleId = value;
                        cfg.staffRoleId ||= value;
                        break;

                    case "submit_review_select":
                        cfg.submitReviewCategoryId = value;
                        break;

                    case "submit_verified_select":
                        cfg.verifiedChannelId = value;
                        break;

                    case "submit_verified_role_select":
                        cfg.verifiedRoleId = value;
                        break;

                    case "report_staff_select":
                        cfg.reportStaffRoleId = value;
                        break;

                    case "report_category_select":
                        cfg.reportCategoryId = value;
                        break;

                    case "verification_role_select":
                        cfg.verificationRoleId = value;
                        break;

                    default:
                        return;
                }

                saveJSON(
                    configFile,
                    config
                );

                return interaction.update({
                    content:
                        "Configuration updated successfully.",
                    components: []
                });
            }

            // ====================================================
            // MODALS
            // ====================================================

            if (interaction.isModalSubmit()) {

                // EMBED BUILDER
                if (
                    interaction.customId ===
                    "embed_builder_modal"
                ) {

                    if (!interaction.client.embedDrafts) {
                        interaction.client.embedDrafts =
                            new Map();
                    }

                    const title =
                        interaction.fields.getTextInputValue(
                            "embed_title"
                        );

                    const description =
                        interaction.fields.getTextInputValue(
                            "embed_description"
                        );

                    const webhookName =
                        interaction.fields.getTextInputValue(
                            "webhook_name"
                        ) ||
                        "Server Listings";

                    const buttonLabel =
                        interaction.fields.getTextInputValue(
                            "button_label"
                        );

                    const buttonUrl =
                        interaction.fields.getTextInputValue(
                            "button_url"
                        );

                    const footer =
                        interaction.fields.getTextInputValue(
                            "embed_footer"
                        );

                    interaction.client.embedDrafts.set(
                        interaction.user.id,
                        {
                            title,
                            description,
                            webhookName,
                            buttonLabel,
                            buttonUrl,
                            footer,
                            channelId:
                                interaction.channel.id
                        }
                    );

                    return interaction.reply({
                        embeds: [
                            createEmbed(
                                "Embed Preview",
                                "Review your webhook embed below before sending it."
                            ),
                            new EmbedBuilder()
                                .setColor(BRAND_COLOUR)
                                .setTitle(title)
                                .setDescription(description)
                                .setFooter({
                                    text:
                                        footer ||
                                        "No footer"
                                })
                        ],
                        components: [
                            new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setCustomId(
                                            "embed_send"
                                        )
                                        .setLabel(
                                            "Send"
                                        )
                                        .setStyle(
                                            ButtonStyle.Success
                                        ),
                                    new ButtonBuilder()
                                        .setCustomId(
                                            "embed_edit"
                                        )
                                        .setLabel(
                                            "Edit"
                                        )
                                        .setStyle(
                                            ButtonStyle.Primary
                                        ),
                                    new ButtonBuilder()
                                        .setCustomId(
                                            "embed_cancel"
                                        )
                                        .setLabel(
                                            "Cancel"
                                        )
                                        .setStyle(
                                            ButtonStyle.Danger
                                        )
                                )
                        ],
                        ephemeral: true
                    });
                }

                // SERVER SUBMISSION
                if (
                    interaction.customId ===
                    "server_submission_modal"
                ) {

                    const serverName =
                        interaction.fields.getTextInputValue(
                            "server_name"
                        );

                    const description =
                        interaction.fields.getTextInputValue(
                            "server_description"
                        );

                    const rawInvite =
                        interaction.fields.getTextInputValue(
                            "server_invite"
                        );

                    const invite =
                        normaliseInvite(
                            rawInvite
                        );

                    const category =
                        interaction.fields.getTextInputValue(
                            "server_category"
                        );

                    const owner =
                        interaction.fields.getTextInputValue(
                            "server_owner"
                        );

                    if (!invite) {
                        return interaction.reply({
                            content:
                                "Please provide a valid Discord invite.",
                            ephemeral: true
                        });
                    }

                    const id =
                        `${interaction.user.id}-${Date.now()}`;

                    submissions.set(
                        id,
                        {
                            userId:
                                interaction.user.id,
                            serverName,
                            description,
                            invite,
                            category,
                            owner,
                            createdAt:
                                Date.now()
                        }
                    );

                    const cfg =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    const staffRole =
                        interaction.guild.roles.cache.get(
                            cfg.submitStaffRoleId
                        );

                    if (!staffRole) {
                        submissions.delete(id);

                        return interaction.reply({
                            content:
                                "Submission staff role is not configured correctly.",
                            ephemeral: true
                        });
                    }

                    const reviewChannel =
                        await interaction.guild.channels.create({
                            name:
                                `review-${safeName(serverName)}`,
                            type:
                                ChannelType.GuildText,
                            parent:
                                cfg.submitReviewCategoryId ||
                                undefined,
                            permissionOverwrites: [
                                {
                                    id:
                                        interaction.guild.roles.everyone.id,
                                    deny: [
                                        PermissionFlagsBits.ViewChannel
                                    ]
                                },
                                {
                                    id:
                                        staffRole.id,
                                    allow: [
                                        PermissionFlagsBits.ViewChannel,
                                        PermissionFlagsBits.SendMessages,
                                        PermissionFlagsBits.ReadMessageHistory
                                    ]
                                },
                                {
                                    id:
                                        client.user.id,
                                    allow: [
                                        PermissionFlagsBits.ViewChannel,
                                        PermissionFlagsBits.SendMessages,
                                        PermissionFlagsBits.ReadMessageHistory,
                                        PermissionFlagsBits.ManageChannels
                                    ]
                                }
                            ]
                        });

                    const reviewEmbed =
                        createEmbed(
                            "New Server Submission",
                            `A server has been submitted for manual verification.\n\n**Submitted by:** <@${interaction.user.id}>`
                        ).addFields(
                            {
                                name:
                                    "Server Name",
                                value:
                                    serverName
                            },
                            {
                                name:
                                    "Description",
                                value:
                                    description
                            },
                            {
                                name:
                                    "Invite",
                                value:
                                    invite
                            },
                            {
                                name:
                                    "Category",
                                value:
                                    category
                            },
                            {
                                name:
                                    "Submitter's Role",
                                value:
                                    owner
                            }
                        );

                    await reviewChannel.send({
                        content:
                            `${staffRole} — new submission awaiting review.`,
                        embeds: [
                            reviewEmbed
                        ],
                        components: [
                            new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setCustomId(
                                            `submission_accept_${id}`
                                        )
                                        .setLabel(
                                            "Accept"
                                        )
                                        .setStyle(
                                            ButtonStyle.Success
                                        ),
                                    new ButtonBuilder()
                                        .setCustomId(
                                            `submission_deny_${id}`
                                        )
                                        .setLabel(
                                            "Deny"
                                        )
                                        .setStyle(
                                            ButtonStyle.Danger
                                        )
                                ]
                        ]
                    });

                    return interaction.reply({
                        embeds: [
                            createEmbed(
                                "Submission Received",
                                "Your server has been submitted successfully.\n\nOur staff team will manually review it and you will receive a DM when a decision has been made."
                            )
                        ],
                        ephemeral: true
                    });
                }

                // DENY SUBMISSION
                if (
                    interaction.customId.startsWith(
                        "submission_deny_modal_"
                    )
                ) {

                    if (!isStaff(interaction.member)) {
                        return interaction.reply({
                            content:
                                "Only staff can deny submissions.",
                            ephemeral: true
                        });
                    }

                    const id =
                        interaction.customId.replace(
                            "submission_deny_modal_",
                            ""
                        );

                    const submission =
                        submissions.get(id);

                    if (!submission) {
                        return interaction.reply({
                            content:
                                "This submission no longer exists.",
                            ephemeral: true
                        });
                    }

                    const reason =
                        interaction.fields.getTextInputValue(
                            "deny_reason"
                        );

                    const applicant =
                        await client.users
                            .fetch(
                                submission.userId
                            )
                            .catch(() => null);

                    if (applicant) {
                        await applicant.send({
                            embeds: [
                                createEmbed(
                                    "Server Submission Denied",
                                    `Your server **${submission.serverName}** was not approved.\n\n**Reason:** ${reason}`
                                )
                            ]
                        }).catch(() => {});
                    }

                    const cfg =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    // Post denial result to community channel
                    if (cfg.verifiedChannelId) {

                        const channel =
                            interaction.guild.channels.cache.get(
                                cfg.verifiedChannelId
                            );

                        if (channel) {

                            const webhook =
                                await getBotWebhook(
                                    channel,
                                    "Server Listing"
                                );

                            if (webhook) {

                                const denied =
                                    new EmbedBuilder()
                                        .setColor(
                                            BRAND_COLOUR
                                        )
                                        .setTitle(
                                            `${LOGO} Server Submission`
                                        )
                                        .setDescription(
                                            `A server submission has been denied.`
                                        )
                                        .addFields(
                                            {
                                                name:
                                                    "Server",
                                                value:
                                                    submission.serverName,
                                                inline: true
                                            },
                                            {
                                                name:
                                                    "Status",
                                                value:
                                                    "Denied",
                                                inline: true
                                            },
                                            {
                                                name:
                                                    "Reason",
                                                value:
                                                    reason
                                            }
                                        )
                                        .setTimestamp();

                                await webhook.send({
                                    username:
                                        "Server Listing",
                                    avatarURL:
                                        client.user.displayAvatarURL(),
                                    embeds: [
                                        denied
                                    ]
                                }).catch(() => {});
                            }
                        }
                    }

                    await interaction.reply({
                        embeds: [
                            createEmbed(
                                "Submission Denied",
                                `This submission has been denied by ${interaction.user}.\n\n**Reason:** ${reason}\n\nThe review channel will now close.`
                            )
                        ]
                    });

                    submissions.delete(id);

                    setTimeout(() => {
                        interaction.channel
                            .delete()
                            .catch(() => {});
                    }, 3000);

                    return;
                }

                // REPORT
                if (
                    interaction.customId ===
                    "server_report_modal"
                ) {

                    const reportedServer =
                        interaction.fields.getTextInputValue(
                            "reported_server"
                        );

                    const reason =
                        interaction.fields.getTextInputValue(
                            "report_reason"
                        );

                    const cfg =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    const staffRole =
                        interaction.guild.roles.cache.get(
                            cfg.reportStaffRoleId
                        );

                    if (!staffRole) {
                        return interaction.reply({
                            content:
                                "Report staff role is not configured.",
                            ephemeral: true
                        });
                    }

                    const channel =
                        await interaction.guild.channels.create({
                            name:
                                `server-reports-${safeName(
                                    interaction.user.username
                                )}`,
                            type:
                                ChannelType.GuildText,
                            parent:
                                cfg.reportCategoryId ||
                                undefined,
                            permissionOverwrites: [
                                {
                                    id:
                                        interaction.guild.roles.everyone.id,
                                    deny: [
                                        PermissionFlagsBits.ViewChannel
                                    ]
                                },
                                {
                                    id:
                                        interaction.user.id,
                                    allow: [
                                        PermissionFlagsBits.ViewChannel,
                                        PermissionFlagsBits.SendMessages,
                                        PermissionFlagsBits.ReadMessageHistory
                                    ]
                                },
                                {
                                    id:
                                        staffRole.id,
                                    allow: [
                                        PermissionFlagsBits.ViewChannel,
                                        PermissionFlagsBits.SendMessages,
                                        PermissionFlagsBits.ReadMessageHistory,
                                        PermissionFlagsBits.ManageMessages
                                    ]
                                },
                                {
                                    id:
                                        client.user.id,
                                    allow: [
                                        PermissionFlagsBits.ViewChannel,
                                        PermissionFlagsBits.SendMessages,
                                        PermissionFlagsBits.ReadMessageHistory,
                                        PermissionFlagsBits.ManageChannels
                                    ]
                                }
                            ]
                        });

                    await channel.send({
                        content:
                            `${staffRole}`,
                        embeds: [
                            createEmbed(
                                "Server Report",
                                `A server has been reported by ${interaction.user}.`
                            ).addFields(
                                {
                                    name:
                                        "Reported Server",
                                    value:
                                        reportedServer
                                },
                                {
                                    name:
                                        "Reason",
                                    value:
                                        reason
                                }
                            )
                        ],
                        components: [
                            new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setCustomId(
                                            `close_report_${interaction.user.id}`
                                        )
                                        .setLabel(
                                            "Close Report"
                                        )
                                        .setStyle(
                                            ButtonStyle.Danger
                                        )
                                )
                        ]
                    });

                    return interaction.reply({
                        content:
                            `Your report has been submitted: ${channel}`,
                        ephemeral: true
                    });
                }
            }

        } catch (error) {

            console.error(
                "INTERACTION ERROR:",
                error
            );

            try {
                if (
                    interaction.replied ||
                    interaction.deferred
                ) {
                    await interaction.followUp({
                        content:
                            "Something went wrong while processing that action.",
                        ephemeral: true
                    });
                } else {
                    await interaction.reply({
                        content:
                            "Something went wrong while processing that action.",
                        ephemeral: true
                    });
                }
            } catch {}
        }
    }
);

// ============================================================
// EMBED BUILDER
// ============================================================

if (!client.embedDrafts) {
    client.embedDrafts = new Map();
}

function showEmbedModal(interaction) {

    const modal =
        new ModalBuilder()
            .setCustomId(
                "embed_builder_modal"
            )
            .setTitle(
                "Webhook Embed Builder"
            );

    modal.addComponents(
        new ActionRowBuilder()
            .addComponents(
                new TextInputBuilder()
                    .setCustomId(
                        "embed_title"
                    )
                    .setLabel(
                        "Embed Title"
                    )
                    .setStyle(
                        TextInputStyle.Short
                    )
                    .setRequired(true)
                    .setMaxLength(256)
            ),
        new ActionRowBuilder()
            .addComponents(
                new TextInputBuilder()
                    .setCustomId(
                        "embed_description"
                    )
                    .setLabel(
                        "Embed Description"
                    )
                    .setStyle(
                        TextInputStyle.Paragraph
                    )
                    .setRequired(true)
                    .setMaxLength(4000)
            ),
        new ActionRowBuilder()
            .addComponents(
                new TextInputBuilder()
                    .setCustomId(
                        "webhook_name"
                    )
                    .setLabel(
                        "Webhook Name"
                    )
                    .setStyle(
                        TextInputStyle.Short
                    )
                    .setRequired(false)
                    .setValue(
                        "Server Listing"
                    )
                    .setMaxLength(80)
            ),
        new ActionRowBuilder()
            .addComponents(
                new TextInputBuilder()
                    .setCustomId(
                        "button_label"
                    )
                    .setLabel(
                        "Button Name"
                    )
                    .setStyle(
                        TextInputStyle.Short
                    )
                    .setRequired(false)
                    .setValue(
                        "Join Server!"
                    )
                    .setMaxLength(80)
            ),
        new ActionRowBuilder()
            .addComponents(
                new TextInputBuilder()
                    .setCustomId(
                        "button_url"
                    )
                    .setLabel(
                        "Button URL"
                    )
                    .setStyle(
                        TextInputStyle.Short
                    )
                    .setRequired(false)
                    .setPlaceholder(
                        "https://discord.gg/example"
                    )
            )
    );

    return interaction.showModal(
        modal
    );
}

function showEmbedBuilder(interaction) {

    const row =
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        "embed_edit"
                    )
                    .setLabel(
                        "Create / Edit Embed"
                    )
                    .setStyle(
                        ButtonStyle.Primary
                    ),
                new ButtonBuilder()
                    .setCustomId(
                        "embed_send"
                    )
                    .setLabel(
                        "Send"
                    )
                    .setStyle(
                        ButtonStyle.Success
                    ),
                new ButtonBuilder()
                    .setCustomId(
                        "embed_cancel"
                    )
                    .setLabel(
                        "Cancel"
                    )
                    .setStyle(
                        ButtonStyle.Danger
                    )
            );

    return interaction.reply({
        embeds: [
            createEmbed(
                "Webhook Embed Builder",
                "Create a webhook message below.\n\n" +
                "The webhook is created automatically in the current channel.\n\n" +
                "**Available options:**\n" +
                "• Embed title\n" +
                "• Description\n" +
                "• Webhook name\n" +
                "• Button name\n" +
                "• Button URL\n" +
                "• Footer"
            )
        ],
        components: [row],
        ephemeral: true
    });
}

// ============================================================
// SELECT HELPERS
// ============================================================

async function roleSelect(
    interaction,
    customId,
    content
) {

    const roles =
        interaction.guild.roles.cache
            .filter(
                role =>
                    role.id !==
                    interaction.guild.id
            )
            .first(25);

    if (!roles.length) {
        return interaction.reply({
            content:
                "No roles are available.",
            ephemeral: true
        });
    }

    const menu =
        new StringSelectMenuBuilder()
            .setCustomId(customId)
            .setPlaceholder("Select a role")
            .addOptions(
                roles.map(role => ({
                    label:
                        role.name.substring(0, 100),
                    value:
                        role.id
                }))
            );

    return interaction.reply({
        content,
        components: [
            new ActionRowBuilder()
                .addComponents(menu)
        ],
        ephemeral: true
    });
}

async function categorySelect(
    interaction,
    customId,
    content
) {

    const categories =
        interaction.guild.channels.cache
            .filter(
                channel =>
                    channel.type ===
                    ChannelType.GuildCategory
            )
            .first(25);

    if (!categories.length) {
        return interaction.reply({
            content:
                "No categories are available.",
            ephemeral: true
        });
    }

    const menu =
        new StringSelectMenuBuilder()
            .setCustomId(customId)
            .setPlaceholder("Select a category")
            .addOptions(
                categories.map(category => ({
                    label:
                        category.name.substring(0, 100),
                    value:
                        category.id
                }))
            );

    return interaction.reply({
        content,
        components: [
            new ActionRowBuilder()
                .addComponents(menu)
        ],
        ephemeral: true
    });
}

async function channelSelect(
    interaction,
    customId,
    content
) {

    const channels =
        interaction.guild.channels.cache
            .filter(
                channel =>
                    channel.type ===
                    ChannelType.GuildText
            )
            .first(25);

    if (!channels.length) {
        return interaction.reply({
            content:
                "No text channels are available.",
            ephemeral: true
        });
    }

    const menu =
        new StringSelectMenuBuilder()
            .setCustomId(customId)
            .setPlaceholder("Select a channel")
            .addOptions(
                channels.map(channel => ({
                    label:
                        channel.name.substring(0, 100),
                    value:
                        channel.id
                }))
            );

    return interaction.reply({
        content,
        components: [
            new ActionRowBuilder()
                .addComponents(menu)
        ],
        ephemeral: true
    });
}

// ============================================================
// TICKET CONFIG
// ============================================================

async function sendTicketConfigPanel(
    interaction,
    edit = false
) {

    const cfg =
        getGuildConfig(
            interaction.guild.id
        );

    const staff =
        cfg.ticketStaffRoleId
            ? interaction.guild.roles.cache.get(
                cfg.ticketStaffRoleId
            )
            : null;

    const category =
        cfg.ticketCategoryId
            ? interaction.guild.channels.cache.get(
                cfg.ticketCategoryId
            )
            : null;

    const logs =
        cfg.ticketLogChannelId
            ? interaction.guild.channels.cache.get(
                cfg.ticketLogChannelId
            )
            : null;

    const embed =
        createEmbed(
            "Ticket Configuration",
            "Configure the complete ticket system."
        ).addFields(
            {
                name: "Staff Role",
                value:
                    staff
                        ? `${staff}`
                        : "Not configured",
                inline: true
            },
            {
                name: "Category",
                value:
                    category
                        ? `${category}`
                        : "Not configured",
                inline: true
            },
            {
                name: "Ticket Logs",
                value:
                    logs
                        ? `${logs}`
                        : "Not configured",
                inline: true
            }
        );

    const rows = [
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        "ticket_set_staff"
                    )
                    .setLabel("Staff Role")
                    .setStyle(
                        ButtonStyle.Primary
                    ),
                new ButtonBuilder()
                    .setCustomId(
                        "ticket_set_category"
                    )
                    .setLabel("Category")
                    .setStyle(
                        ButtonStyle.Secondary
                    ),
                new ButtonBuilder()
                    .setCustomId(
                        "ticket_set_logs"
                    )
                    .setLabel("Ticket Logs")
                    .setStyle(
                        ButtonStyle.Secondary
                    )
            ),
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        "ticket_send_panel"
                    )
                    .setLabel("Send Panel")
                    .setStyle(
                        ButtonStyle.Success
                    ),
                new ButtonBuilder()
                    .setCustomId(
                        "ticket_refresh"
                    )
                    .setLabel("Refresh")
                    .setStyle(
                        ButtonStyle.Secondary
                    )
            )
    ];

    if (edit) {
        return interaction.update({
            embeds: [embed],
            components: rows
        });
    }

    return interaction.reply({
        embeds: [embed],
        components: rows,
        ephemeral: true
    });
}

// ============================================================
// SUBMISSION CONFIG
// ============================================================

async function sendSubmitConfigPanel(
    interaction,
    edit = false
) {

    const cfg =
        getGuildConfig(
            interaction.guild.id
        );

    const staff =
        cfg.submitStaffRoleId
            ? interaction.guild.roles.cache.get(
                cfg.submitStaffRoleId
            )
            : null;

    const review =
        cfg.submitReviewCategoryId
            ? interaction.guild.channels.cache.get(
                cfg.submitReviewCategoryId
            )
            : null;

    const verified =
        cfg.verifiedChannelId
            ? interaction.guild.channels.cache.get(
                cfg.verifiedChannelId
            )
            : null;

    const verifiedRole =
        cfg.verifiedRoleId
            ? interaction.guild.roles.cache.get(
                cfg.verifiedRoleId
            )
            : null;

    const embed =
        createEmbed(
            "Server Submission Configuration",
            "Configure how server submissions are reviewed and listed."
        ).addFields(
            {
                name: "Submission Staff",
                value:
                    staff
                        ? `${staff}`
                        : "Not configured",
                inline: true
            },
            {
                name: "Review Category",
                value:
                    review
                        ? `${review}`
                        : "Not configured",
                inline: true
            },
            {
                name: "Community Channel",
                value:
                    verified
                        ? `${verified}`
                        : "Not configured",
                inline: true
            },
            {
                name: "Verified Role",
                value:
                    verifiedRole
                        ? `${verifiedRole}`
                        : "Not configured",
                inline: true
            },
            {
                name: "Approval System",
                value:
                    "Accept → Server Listing webhook + Join Server button → review channel closes.\n\n" +
                    "Deny → DM applicant + denial result → review channel closes.",
                inline: false
            }
        );

    const rows = [
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        "submit_set_staff"
                    )
                    .setLabel("Staff Role")
                    .setStyle(
                        ButtonStyle.Primary
                    ),
                new ButtonBuilder()
                    .setCustomId(
                        "submit_set_review"
                    )
                    .setLabel("Review Category")
                    .setStyle(
                        ButtonStyle.Secondary
                    ),
                new ButtonBuilder()
                    .setCustomId(
                        "submit_set_verified"
                    )
                    .setLabel("Community Channel")
                    .setStyle(
                        ButtonStyle.Secondary
                    )
            ),
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        "submit_set_verified_role"
                    )
                    .setLabel("Verified Role")
                    .setStyle(
                        ButtonStyle.Primary
                    ),
                new ButtonBuilder()
                    .setCustomId(
                        "submit_send_panel"
                    )
                    .setLabel("Send Panel")
                    .setStyle(
                        ButtonStyle.Success
                    ),
                new ButtonBuilder()
                    .setCustomId(
                        "submit_refresh"
                    )
                    .setLabel("Refresh")
                    .setStyle(
                        ButtonStyle.Secondary
                    )
            )
    ];

    if (edit) {
        return interaction.update({
            embeds: [embed],
            components: rows
        });
    }

    return interaction.reply({
        embeds: [embed],
        components: rows,
        ephemeral: true
    });
}

// ============================================================
// REPORT CONFIG
// ============================================================

async function sendReportConfigPanel(
    interaction,
    edit = false
) {

    const cfg =
        getGuildConfig(
            interaction.guild.id
        );

    const staff =
        cfg.reportStaffRoleId
            ? interaction.guild.roles.cache.get(
                cfg.reportStaffRoleId
            )
            : null;

    const category =
        cfg.reportCategoryId
            ? interaction.guild.channels.cache.get(
                cfg.reportCategoryId
            )
            : null;

    const embed =
        createEmbed(
            "Server Report Configuration",
            "Configure where server reports are created and who can handle them."
        ).addFields(
            {
                name: "Report Staff",
                value:
                    staff
                        ? `${staff}`
                        : "Not configured",
                inline: true
            },
            {
                name: "Report Category",
                value:
                    category
                        ? `${category}`
                        : "Not configured",
                inline: true
            },
            {
                name: "Report Channels",
                value:
                    "Reports are automatically named:\n`server-reports-{user}`",
                inline: false
            }
        );

    const rows = [
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        "report_set_staff"
                    )
                    .setLabel("Staff Role")
                    .setStyle(
                        ButtonStyle.Primary
                    ),
                new ButtonBuilder()
                    .setCustomId(
                        "report_set_category"
                    )
                    .setLabel("Category")
                    .setStyle(
                        ButtonStyle.Secondary
                    ),
                new ButtonBuilder()
                    .setCustomId(
                        "report_send_panel"
                    )
                    .setLabel("Send Panel")
                    .setStyle(
                        ButtonStyle.Success
                    )
            ),
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        "report_refresh"
                    )
                    .setLabel("Refresh")
                    .setStyle(
                        ButtonStyle.Secondary
                    )
            )
    ];

    if (edit) {
        return interaction.update({
            embeds: [embed],
            components: rows
        });
    }

    return interaction.reply({
        embeds: [embed],
        components: rows,
        ephemeral: true
    });
}

// ============================================================
// VERIFICATION CONFIG
// ============================================================

async function sendVerificationPanel(
    interaction,
    edit = false
) {

    const cfg =
        getGuildConfig(
            interaction.guild.id
        );

    const role =
        cfg.verificationRoleId
            ? interaction.guild.roles.cache.get(
                cfg.verificationRoleId
            )
            : null;

    const embed =
        createEmbed(
            "Verification Configuration",
            "Configure the member verification system."
        ).addFields({
            name: "Verification Role",
            value:
                role
                    ? `${role}`
                    : "Not configured"
        });

    const row =
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        "verification_set_role"
                    )
                    .setLabel(
                        "Verification Role"
                    )
                    .setStyle(
                        ButtonStyle.Primary
                    ),
                new ButtonBuilder()
                    .setCustomId(
                        "verification_send_panel"
                    )
                    .setLabel(
                        "Send Panel"
                    )
                    .setStyle(
                        ButtonStyle.Success
                    ),
                new ButtonBuilder()
                    .setCustomId(
                        "verification_refresh"
                    )
                    .setLabel(
                        "Refresh"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    )
            );

    if (edit) {
        return interaction.update({
            embeds: [embed],
            components: [row]
        });
    }

    return interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true
    });
}

// ============================================================
// WELCOME SYSTEM
// ============================================================

client.on(
    "guildMemberAdd",
    async member => {

        try {

            const cfg =
                getGuildConfig(
                    member.guild.id
                );

            if (!cfg.welcomeChannelId) {
                return;
            }

            const channel =
                member.guild.channels.cache.get(
                    cfg.welcomeChannelId
                );

            if (!channel) return;

            // NO THUMBNAIL / NO USER PFP
            const embed =
                createEmbed(
                    "Welcome!",
                    `Welcome to **${member.guild.name}**, ${member}!\n\nWe're glad to have you here.`
                );

            await channel.send({
                embeds: [embed]
            });

        } catch (error) {
            console.error(
                "Welcome error:",
                error
            );
        }
    }
);

// ============================================================
// CLEAN SUBMISSIONS
// ============================================================

setInterval(() => {

    const now = Date.now();

    for (
        const [
            id,
            submission
        ] of submissions.entries()
    ) {

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
// LOGIN
// ============================================================

client.login(TOKEN);
