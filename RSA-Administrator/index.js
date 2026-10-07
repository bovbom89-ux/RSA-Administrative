require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    Partials,
    PermissionsBitField,
    REST,
    Routes,
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ChannelType,
    AttachmentBuilder
} = require("discord.js");

const fs = require("fs");
const path = require("path");

/* =========================================================
   CONFIG
========================================================= */

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const EMBED_COLOUR = "#2F4DA8";
const RSA_LOGO = "<:Our_Logo:1557149633623363594>";
const BOT_VERSION = "5.0.0";

if (!TOKEN) {
    console.error("DISCORD_TOKEN is missing.");
    process.exit(1);
}

if (!CLIENT_ID) {
    console.error("CLIENT_ID is missing.");
    process.exit(1);
}

if (!GUILD_ID) {
    console.error("GUILD_ID is missing.");
    process.exit(1);
}

/* =========================================================
   CLIENT
========================================================= */

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [
        Partials.Channel,
        Partials.GuildMember,
        Partials.Message
    ]
});

/* =========================================================
   DATA
========================================================= */

const DATA_DIR = path.join(__dirname, "data");

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, {
        recursive: true
    });
}

const WARNINGS_FILE = path.join(
    DATA_DIR,
    "warnings.json"
);

const CONFIG_FILE = path.join(
    DATA_DIR,
    "config.json"
);

function loadJSON(file, fallback) {

    try {

        if (!fs.existsSync(file)) {

            fs.writeFileSync(
                file,
                JSON.stringify(
                    fallback,
                    null,
                    2
                )
            );

            return fallback;
        }

        return JSON.parse(
            fs.readFileSync(
                file,
                "utf8"
            )
        );

    } catch (error) {

        console.error(
            `Could not load ${file}:`,
            error
        );

        return fallback;
    }
}

function saveJSON(file, data) {

    try {

        fs.writeFileSync(
            file,
            JSON.stringify(
                data,
                null,
                2
            )
        );

    } catch (error) {

        console.error(
            `Could not save ${file}:`,
            error
        );
    }
}

const warnings = loadJSON(
    WARNINGS_FILE,
    {}
);

const configs = loadJSON(
    CONFIG_FILE,
    {}
);

const embedSessions = new Map();

/* =========================================================
   EMBEDS
========================================================= */

function brandedTitle(title) {

    return `${RSA_LOGO} ${title}`;
}

function createEmbed(options = {}) {

    const embed = new EmbedBuilder()
        .setColor(EMBED_COLOUR);

    if (options.title) {

        embed.setTitle(
            brandedTitle(
                options.title
            )
        );
    }

    if (options.description) {

        embed.setDescription(
            options.description
        );
    }

    if (options.fields) {

        embed.addFields(
            options.fields
        );
    }

    if (options.thumbnail) {

        embed.setThumbnail(
            options.thumbnail
        );
    }

    if (options.image) {

        embed.setImage(
            options.image
        );
    }

    if (options.footer) {

        embed.setFooter({
            text: options.footer
        });
    }

    if (options.timestamp !== false) {

        embed.setTimestamp();
    }

    return embed;
}

/* =========================================================
   COMMANDS
========================================================= */

const commands = [

    new SlashCommandBuilder()
        .setName("help")
        .setDescription(
            "View RSA Administrator commands."
        ),

    new SlashCommandBuilder()
        .setName("ping")
        .setDescription(
            "Check the bot's latency."
        ),

    new SlashCommandBuilder()
        .setName("botinfo")
        .setDescription(
            "View information about RSA Administrator."
        ),

    new SlashCommandBuilder()
        .setName("serverinfo")
        .setDescription(
            "View information about this server."
        ),

    new SlashCommandBuilder()
        .setName("userinfo")
        .setDescription(
            "View information about a member."
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription(
                    "Member to inspect."
                )
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("ban")
        .setDescription(
            "Ban a member."
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription(
                    "Member to ban."
                )
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription(
                    "Reason for the ban."
                )
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("kick")
        .setDescription(
            "Kick a member."
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription(
                    "Member to kick."
                )
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription(
                    "Reason for the kick."
                )
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("timeout")
        .setDescription(
            "Timeout a member."
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription(
                    "Member to timeout."
                )
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName("minutes")
                .setDescription(
                    "Timeout duration."
                )
                .setMinValue(1)
                .setMaxValue(40320)
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription(
                    "Reason."
                )
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("untimeout")
        .setDescription(
            "Remove a member's timeout."
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription(
                    "Member."
                )
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("warn")
        .setDescription(
            "Warn a member."
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription(
                    "Member."
                )
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription(
                    "Warning reason."
                )
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("warnings")
        .setDescription(
            "View a member's warnings."
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription(
                    "Member."
                )
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("clearwarnings")
        .setDescription(
            "Clear a member's warnings."
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription(
                    "Member."
                )
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("purge")
        .setDescription(
            "Delete recent messages."
        )
        .addIntegerOption(option =>
            option
                .setName("amount")
                .setDescription(
                    "Number of messages to delete."
                )
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("lock")
        .setDescription(
            "Lock the current channel."
        ),

    new SlashCommandBuilder()
        .setName("unlock")
        .setDescription(
            "Unlock the current channel."
        ),

    new SlashCommandBuilder()
        .setName("slowmode")
        .setDescription(
            "Set the channel slowmode."
        )
        .addIntegerOption(option =>
            option
                .setName("seconds")
                .setDescription(
                    "Slowmode duration."
                )
                .setMinValue(0)
                .setMaxValue(21600)
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("role")
        .setDescription(
            "Manage member roles."
        )
        .addSubcommand(sub =>
            sub
                .setName("add")
                .setDescription(
                    "Add a role."
                )
                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription(
                            "Member."
                        )
                        .setRequired(true)
                )
                .addRoleOption(option =>
                    option
                        .setName("role")
                        .setDescription(
                            "Role."
                        )
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("remove")
                .setDescription(
                    "Remove a role."
                )
                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription(
                            "Member."
                        )
                        .setRequired(true)
                )
                .addRoleOption(option =>
                    option
                        .setName("role")
                        .setDescription(
                            "Role."
                        )
                        .setRequired(true)
                )
        ),

    new SlashCommandBuilder()
        .setName("announce")
        .setDescription(
            "Create an RSA announcement."
        )
        .addStringOption(option =>
            option
                .setName("title")
                .setDescription(
                    "Announcement title."
                )
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("message")
                .setDescription(
                    "Announcement message."
                )
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("embed")
        .setDescription(
            "Open the interactive embed creator."
        ),

    new SlashCommandBuilder()
        .setName("setlogs")
        .setDescription(
            "Set the moderation log channel."
        )
        .addChannelOption(option =>
            option
                .setName("channel")
                .setDescription(
                    "Channel to receive logs."
                )
                .addChannelTypes(
                    ChannelType.GuildText
                )
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("logs")
        .setDescription(
            "View the configured log channel."
        ),

    /* =====================================================
       TICKET SETUP
    ===================================================== */

    new SlashCommandBuilder()
        .setName("ticketsetup")
        .setDescription(
            "Configure the RSA ticket system."
        )
        .addChannelOption(option =>
            option
                .setName("category")
                .setDescription(
                    "Category where tickets will be created."
                )
                .addChannelTypes(
                    ChannelType.GuildCategory
                )
                .setRequired(true)
        )
        .addChannelOption(option =>
            option
                .setName("panel")
                .setDescription(
                    "Channel where the ticket panel will be sent."
                )
                .addChannelTypes(
                    ChannelType.GuildText
                )
                .setRequired(true)
        )
        .addChannelOption(option =>
            option
                .setName("logs")
                .setDescription(
                    "Channel for ticket logs."
                )
                .addChannelTypes(
                    ChannelType.GuildText
                )
                .setRequired(true)
        )
        .addRoleOption(option =>
            option
                .setName("support")
                .setDescription(
                    "Role allowed to manage tickets."
                )
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("ticketconfig")
        .setDescription(
            "View the current ticket configuration."
        ),

    new SlashCommandBuilder()
        .setName("embed")
        .setDescription(
            "Open the interactive embed creator."
        )

].map(command =>
    command.toJSON()
);

/* =========================================================
   REGISTER COMMANDS
========================================================= */

async function registerCommands() {

    const rest = new REST({
        version: "10"
    }).setToken(TOKEN);

    console.log(
        "Registering commands..."
    );

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
        "Commands registered."
    );
}

/* =========================================================
   PERMISSIONS
========================================================= */

function hasPermission(
    interaction,
    permission
) {

    return interaction.member.permissions.has(
        permission
    );
}

function isTicketStaff(
    interaction
) {

    const config =
        configs[
            interaction.guild.id
        ];

    if (!config?.ticket?.supportRole) {
        return hasPermission(
            interaction,
            PermissionsBitField.Flags.ManageChannels
        );
    }

    return (
        interaction.member.roles.cache.has(
            config.ticket.supportRole
        ) ||
        interaction.member.permissions.has(
            PermissionsBitField.Flags.ManageChannels
        ) ||
        interaction.guild.ownerId ===
            interaction.user.id
    );
}

function canModerate(
    interaction,
    member
) {

    if (!member) {
        return false;
    }

    if (
        member.id ===
        interaction.user.id
    ) {
        return false;
    }

    if (
        member.id ===
        interaction.guild.ownerId
    ) {
        return false;
    }

    if (
        interaction.member.id !==
        interaction.guild.ownerId
    ) {

        if (
            member.roles.highest.position >=
            interaction.member.roles.highest.position
        ) {
            return false;
        }
    }

    if (
        member.roles.highest.position >=
        interaction.guild.members.me.roles.highest.position
    ) {
        return false;
    }

    return true;
}

/* =========================================================
   LOGGING
========================================================= */

async function logAction(
    guild,
    title,
    description
) {

    const config =
        configs[guild.id];

    if (!config?.logChannel) {
        return;
    }

    const channel =
        guild.channels.cache.get(
            config.logChannel
        );

    if (!channel) {
        return;
    }

    const embed =
        createEmbed({
            title,
            description
        });

    await channel.send({
        embeds: [embed]
    }).catch(() => {});
}

/* =========================================================
   READY
========================================================= */

client.once(
    "ready",
    async () => {

        console.log(
            `Logged in as ${client.user.tag}`
        );

        client.user.setPresence({
            status: "online",
            activities: [
                {
                    name:
                        "Roblox Schools Association",
                    type: 3
                }
            ]
        });

        try {

            await registerCommands();

        } catch (error) {

            console.error(
                "Command registration failed:",
                error
            );
        }
    }
);

/* =========================================================
   INTERACTION ROUTER
========================================================= */

client.on(
    "interactionCreate",
    async interaction => {

        try {

            if (
                interaction.isChatInputCommand()
            ) {

                await handleCommand(
                    interaction
                );

                return;
            }

            if (
                interaction.isButton()
            ) {

                await handleButton(
                    interaction
                );

                return;
            }

            if (
                interaction.isModalSubmit()
            ) {

                await handleModal(
                    interaction
                );

                return;
            }

        } catch (error) {

            console.error(
                "Interaction error:",
                error
            );

            const response = {
                content:
                    "An unexpected error occurred.",
                ephemeral: true
            };

            if (
                interaction.replied ||
                interaction.deferred
            ) {

                await interaction.followUp(
                    response
                ).catch(() => {});

            } else {

                await interaction.reply(
                    response
                ).catch(() => {});
            }
        }
    }
);

/* =========================================================
   COMMAND HANDLER
========================================================= */

async function handleCommand(
    interaction
) {

    const command =
        interaction.commandName;

    /* =====================================================
       HELP
    ===================================================== */

    if (command === "help") {

        const embed =
            createEmbed({
                title:
                    "RSA Administrator",
                description:
                    "Administration and moderation tools for the Roblox Schools Association.",
                fields: [
                    {
                        name:
                            "Moderation",
                        value:
                            "`/ban` `/kick` `/timeout` `/untimeout` `/warn` `/warnings` `/clearwarnings` `/purge`"
                    },
                    {
                        name:
                            "Management",
                        value:
                            "`/lock` `/unlock` `/slowmode` `/role` `/announce`"
                    },
                    {
                        name:
                            "Information",
                        value:
                            "`/serverinfo` `/userinfo` `/botinfo` `/ping`"
                    },
                    {
                        name:
                            "Tools",
                        value:
                            "`/embed` `/setlogs` `/logs`"
                    },
                    {
                        name:
                            "Tickets",
                        value:
                            "`/ticketsetup` `/ticketconfig`"
                    }
                ],
                footer:
                    "Roblox Schools Association"
            });

        return interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }

    /* =====================================================
       PING
    ===================================================== */

    if (command === "ping") {

        const embed =
            createEmbed({
                title:
                    "Bot Status",
                description:
                    `Latency: **${client.ws.ping}ms**`
            });

        return interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }

    /* =====================================================
       BOT INFO
    ===================================================== */

    if (command === "botinfo") {

        const embed =
            createEmbed({
                title:
                    "RSA Administrator",
                description:
                    "Administration bot for the Roblox Schools Association.",
                fields: [
                    {
                        name:
                            "Version",
                        value:
                            BOT_VERSION,
                        inline: true
                    },
                    {
                        name:
                            "Latency",
                        value:
                            `${client.ws.ping}ms`,
                        inline: true
                    },
                    {
                        name:
                            "Servers",
                        value:
                            `${client.guilds.cache.size}`,
                        inline: true
                    }
                ],
                footer:
                    "Roblox Schools Association"
            });

        return interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }

    /* =====================================================
       SERVER INFO
    ===================================================== */

    if (command === "serverinfo") {

        const guild =
            interaction.guild;

        const embed =
            createEmbed({
                title:
                    "Server Information",
                thumbnail:
                    guild.iconURL({
                        size: 256
                    }),
                fields: [
                    {
                        name:
                            "Server",
                        value:
                            guild.name
                    },
                    {
                        name:
                            "Members",
                        value:
                            `${guild.memberCount}`,
                        inline: true
                    },
                    {
                        name:
                            "Channels",
                        value:
                            `${guild.channels.cache.size}`,
                        inline: true
                    },
                    {
                        name:
                            "Roles",
                        value:
                            `${guild.roles.cache.size}`,
                        inline: true
                    },
                    {
                        name:
                            "Owner",
                        value:
                            `<@${guild.ownerId}>`
                    },
                    {
                        name:
                            "Created",
                        value:
                            `<t:${Math.floor(
                                guild.createdTimestamp /
                                    1000
                            )}:D>`
                    }
                ]
            });

        return interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }

    /* =====================================================
       USER INFO
    ===================================================== */

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

        const roles =
            member
                ? member.roles.cache
                    .filter(
                        role =>
                            role.id !==
                            interaction.guild.id
                    )
                    .sort(
                        (a, b) =>
                            b.position -
                            a.position
                    )
                    .map(
                        role =>
                            role.toString()
                    )
                    .slice(0, 15)
                    .join(" ") ||
                    "No roles"
                : "Not in server";

        const embed =
            createEmbed({
                title:
                    "User Information",
                thumbnail:
                    user.displayAvatarURL({
                        size: 256
                    }),
                fields: [
                    {
                        name:
                            "User",
                        value:
                            user.tag
                    },
                    {
                        name:
                            "User ID",
                        value:
                            user.id
                    },
                    {
                        name:
                            "Account Created",
                        value:
                            `<t:${Math.floor(
                                user.createdTimestamp /
                                    1000
                            )}:F>`
                    },
                    {
                        name:
                            "Joined Server",
                        value:
                            member
                                ? `<t:${Math.floor(
                                    member.joinedTimestamp /
                                        1000
                                )}:F>`
                                : "Not in server"
                    },
                    {
                        name:
                            "Roles",
                        value:
                            roles
                    }
                ]
            });

        return interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }

    /* =====================================================
       BAN
    ===================================================== */

    if (command === "ban") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.BanMembers
            )
        ) {

            return interaction.reply({
                content:
                    "You need the Ban Members permission.",
                ephemeral: true
            });
        }

        const user =
            interaction.options.getUser(
                "user"
            );

        const reason =
            interaction.options.getString(
                "reason"
            ) ||
            "No reason provided.";

        const member =
            await interaction.guild.members
                .fetch(user.id)
                .catch(() => null);

        if (
            member &&
            !canModerate(
                interaction,
                member
            )
        ) {

            return interaction.reply({
                content:
                    "You cannot moderate this member because of the role hierarchy.",
                ephemeral: true
            });
        }

        await interaction.guild.members.ban(
            user.id,
            {
                reason
            }
        );

        await logAction(
            interaction.guild,
            "Member Banned",
            `Member: ${user.tag}\nModerator: ${interaction.user}\nReason: ${reason}`
        );

        return interaction.reply(
            `**${user.tag}** has been banned.`
        );
    }

    /* =====================================================
       KICK
    ===================================================== */

    if (command === "kick") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.KickMembers
            )
        ) {

            return interaction.reply({
                content:
                    "You need the Kick Members permission.",
                ephemeral: true
            });
        }

        const user =
            interaction.options.getUser(
                "user"
            );

        const reason =
            interaction.options.getString(
                "reason"
            ) ||
            "No reason provided.";

        const member =
            await interaction.guild.members
                .fetch(user.id)
                .catch(() => null);

        if (
            !member ||
            !canModerate(
                interaction,
                member
            )
        ) {

            return interaction.reply({
                content:
                    "You cannot kick this member.",
                ephemeral: true
            });
        }

        await member.kick(
            reason
        );

        await logAction(
            interaction.guild,
            "Member Kicked",
            `Member: ${user.tag}\nModerator: ${interaction.user}\nReason: ${reason}`
        );

        return interaction.reply(
            `**${user.tag}** has been kicked.`
        );
    }

    /* =====================================================
       TIMEOUT
    ===================================================== */

    if (command === "timeout") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ModerateMembers
            )
        ) {

            return interaction.reply({
                content:
                    "You need the Moderate Members permission.",
                ephemeral: true
            });
        }

        const user =
            interaction.options.getUser(
                "user"
            );

        const minutes =
            interaction.options.getInteger(
                "minutes"
            );

        const reason =
            interaction.options.getString(
                "reason"
            ) ||
            "No reason provided.";

        const member =
            await interaction.guild.members
                .fetch(user.id)
                .catch(() => null);

        if (
            !member ||
            !canModerate(
                interaction,
                member
            )
        ) {

            return interaction.reply({
                content:
                    "You cannot timeout this member.",
                ephemeral: true
            });
        }

        await member.timeout(
            minutes * 60 * 1000,
            reason
        );

        await logAction(
            interaction.guild,
            "Member Timed Out",
            `Member: ${user.tag}\nDuration: ${minutes} minutes\nModerator: ${interaction.user}\nReason: ${reason}`
        );

        return interaction.reply(
            `**${user.tag}** has been timed out for **${minutes} minutes**.`
        );
    }

    /* =====================================================
       UNTIMEOUT
    ===================================================== */

    if (command === "untimeout") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ModerateMembers
            )
        ) {

            return interaction.reply({
                content:
                    "You need the Moderate Members permission.",
                ephemeral: true
            });
        }

        const user =
            interaction.options.getUser(
                "user"
            );

        const member =
            await interaction.guild.members
                .fetch(user.id)
                .catch(() => null);

        if (
            !member ||
            !canModerate(
                interaction,
                member
            )
        ) {

            return interaction.reply({
                content:
                    "You cannot modify this member.",
                ephemeral: true
            });
        }

        await member.timeout(
            null,
            `Timeout removed by ${interaction.user.tag}`
        );

        return interaction.reply(
            `Timeout removed from **${user.tag}**.`
        );
    }

    /* =====================================================
       WARN
    ===================================================== */

    if (command === "warn") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ModerateMembers
            )
        ) {

            return interaction.reply({
                content:
                    "You need the Moderate Members permission.",
                ephemeral: true
            });
        }

        const user =
            interaction.options.getUser(
                "user"
            );

        const reason =
            interaction.options.getString(
                "reason"
            );

        const member =
            await interaction.guild.members
                .fetch(user.id)
                .catch(() => null);

        if (
            !member ||
            !canModerate(
                interaction,
                member
            )
        ) {

            return interaction.reply({
                content:
                    "You cannot warn this member.",
                ephemeral: true
            });
        }

        const key =
            `${interaction.guild.id}:${user.id}`;

        if (!warnings[key]) {
            warnings[key] = [];
        }

        warnings[key].push({
            reason,
            moderator:
                interaction.user.id,
            timestamp:
                Date.now()
        });

        saveJSON(
            WARNINGS_FILE,
            warnings
        );

        await logAction(
            interaction.guild,
            "Member Warned",
            `Member: ${user.tag}\nModerator: ${interaction.user}\nReason: ${reason}`
        );

        return interaction.reply(
            `**${user.tag}** has been warned.`
        );
    }

    /* =====================================================
       WARNINGS
    ===================================================== */

    if (command === "warnings") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ModerateMembers
            )
        ) {

            return interaction.reply({
                content:
                    "You need the Moderate Members permission.",
                ephemeral: true
            });
        }

        const user =
            interaction.options.getUser(
                "user"
            );

        const key =
            `${interaction.guild.id}:${user.id}`;

        const list =
            warnings[key] || [];

        if (!list.length) {

            const embed =
                createEmbed({
                    title:
                        "Warnings",
                    description:
                        `**${user.tag}** has no warnings.`
                });

            return interaction.reply({
                embeds: [embed],
                ephemeral: true
            });
        }

        const description =
            list
                .map(
                    (item, index) =>
                        `**${index + 1}.** ${item.reason}\n` +
                        `Moderator: <@${item.moderator}>\n` +
                        `<t:${Math.floor(
                            item.timestamp /
                                1000
                        )}:R>`
                )
                .join("\n\n");

        const embed =
            createEmbed({
                title:
                    `Warnings — ${user.tag}`,
                description:
                    description.slice(
                        0,
                        4000
                    )
            });

        return interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }

    /* =====================================================
       CLEAR WARNINGS
    ===================================================== */

    if (command === "clearwarnings") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ModerateMembers
            )
        ) {

            return interaction.reply({
                content:
                    "You need the Moderate Members permission.",
                ephemeral: true
            });
        }

        const user =
            interaction.options.getUser(
                "user"
            );

        const key =
            `${interaction.guild.id}:${user.id}`;

        delete warnings[key];

        saveJSON(
            WARNINGS_FILE,
            warnings
        );

        return interaction.reply(
            `Warnings cleared for **${user.tag}**.`
        );
    }

    /* =====================================================
       PURGE
    ===================================================== */

    if (command === "purge") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageMessages
            )
        ) {

            return interaction.reply({
                content:
                    "You need the Manage Messages permission.",
                ephemeral: true
            });
        }

        const amount =
            interaction.options.getInteger(
                "amount"
            );

        const deleted =
            await interaction.channel.bulkDelete(
                amount,
                true
            );

        return interaction.reply({
            content:
                `Deleted ${deleted.size} messages.`,
            ephemeral: true
        });
    }

    /* =====================================================
       LOCK
    ===================================================== */

    if (command === "lock") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageChannels
            )
        ) {

            return interaction.reply({
                content:
                    "You need the Manage Channels permission.",
                ephemeral: true
            });
        }

        await interaction.channel.permissionOverwrites.edit(
            interaction.guild.roles.everyone,
            {
                SendMessages: false
            }
        );

        await logAction(
            interaction.guild,
            "Channel Locked",
            `Channel: ${interaction.channel}\nModerator: ${interaction.user}`
        );

        return interaction.reply(
            "This channel has been locked."
        );
    }

    /* =====================================================
       UNLOCK
    ===================================================== */

    if (command === "unlock") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageChannels
            )
        ) {

            return interaction.reply({
                content:
                    "You need the Manage Channels permission.",
                ephemeral: true
            });
        }

        await interaction.channel.permissionOverwrites.edit(
            interaction.guild.roles.everyone,
            {
                SendMessages: null
            }
        );

        return interaction.reply(
            "This channel has been unlocked."
        );
    }

    /* =====================================================
       SLOWMODE
    ===================================================== */

    if (command === "slowmode") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageChannels
            )
        ) {

            return interaction.reply({
                content:
                    "You need the Manage Channels permission.",
                ephemeral: true
            });
        }

        const seconds =
            interaction.options.getInteger(
                "seconds"
            );

        await interaction.channel.setRateLimitPerUser(
            seconds
        );

        return interaction.reply(
            seconds === 0
                ? "Slowmode disabled."
                : `Slowmode set to **${seconds} seconds**.`
        );
    }

    /* =====================================================
       ROLE
    ===================================================== */

    if (command === "role") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageRoles
            )
        ) {

            return interaction.reply({
                content:
                    "You need the Manage Roles permission.",
                ephemeral: true
            });
        }

        const subcommand =
            interaction.options.getSubcommand();

        const user =
            interaction.options.getUser(
                "user"
            );

        const role =
            interaction.options.getRole(
                "role"
            );

        const member =
            await interaction.guild.members
                .fetch(user.id)
                .catch(() => null);

        if (!member) {

            return interaction.reply({
                content:
                    "Member not found.",
                ephemeral: true
            });
        }

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

        if (
            role.position >=
            interaction.guild.members.me.roles.highest.position
        ) {

            return interaction.reply({
                content:
                    "My bot role is not high enough to manage that role.",
                ephemeral: true
            });
        }

        if (
            subcommand === "add"
        ) {

            await member.roles.add(
                role
            );

            return interaction.reply(
                `Added ${role} to **${user.tag}**.`
            );
        }

        await member.roles.remove(
            role
        );

        return interaction.reply(
            `Removed ${role} from **${user.tag}**.`
        );
    }

    /* =====================================================
       ANNOUNCE
    ===================================================== */

    if (command === "announce") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageMessages
            )
        ) {

            return interaction.reply({
                content:
                    "You need the Manage Messages permission.",
                ephemeral: true
            });
        }

        const title =
            interaction.options.getString(
                "title"
            );

        const message =
            interaction.options.getString(
                "message"
            );

        const embed =
            createEmbed({
                title,
                description:
                    message,
                footer:
                    "Roblox Schools Association"
            });

        await interaction.channel.send({
            embeds: [embed]
        });

        return interaction.reply({
            content:
                "Announcement sent.",
            ephemeral: true
        });
    }

    /* =====================================================
       EMBED CREATOR
    ===================================================== */

    if (command === "embed") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageMessages
            )
        ) {

            return interaction.reply({
                content:
                    "You need the Manage Messages permission.",
                ephemeral: true
            });
        }

        embedSessions.set(
            interaction.user.id,
            {
                title:
                    "RSA Announcement",
                description:
                    "",
                footer:
                    "Roblox Schools Association",
                image:
                    "",
                thumbnail:
                    "",
                fields:
                    []
            }
        );

        return showEmbedBuilder(
            interaction
        );
    }

    /* =====================================================
       SET LOGS
    ===================================================== */

    if (command === "setlogs") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageGuild
            )
        ) {

            return interaction.reply({
                content:
                    "You need the Manage Server permission.",
                ephemeral: true
            });
        }

        const channel =
            interaction.options.getChannel(
                "channel"
            );

        configs[
            interaction.guild.id
        ] = {
            ...(
                configs[
                    interaction.guild.id
                ] || {}
            ),
            logChannel:
                channel.id
        };

        saveJSON(
            CONFIG_FILE,
            configs
        );

        return interaction.reply(
            `Moderation logs are now being sent to ${channel}.`
        );
    }

    /* =====================================================
       LOGS
    ===================================================== */

    if (command === "logs") {

        const channel =
            configs[
                interaction.guild.id
            ]?.logChannel;

        const embed =
            createEmbed({
                title:
                    "Moderation Logs",
                description:
                    channel
                        ? `Current log channel: <#${channel}>`
                        : "No log channel has been configured."
            });

        return interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }

    /* =====================================================
       TICKET SETUP
    ===================================================== */

    if (command === "ticketsetup") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageGuild
            )
        ) {

            return interaction.reply({
                content:
                    "You need the Manage Server permission.",
                ephemeral: true
            });
        }

        const category =
            interaction.options.getChannel(
                "category"
            );

        const panel =
            interaction.options.getChannel(
                "panel"
            );

        const logs =
            interaction.options.getChannel(
                "logs"
            );

        const support =
            interaction.options.getRole(
                "support"
            );

        if (
            !configs[
                interaction.guild.id
            ]
        ) {

            configs[
                interaction.guild.id
            ] = {};
        }

        configs[
            interaction.guild.id
        ].ticket = {
            category:
                category.id,
            panelChannel:
                panel.id,
            logsChannel:
                logs.id,
            supportRole:
                support.id
        };

        saveJSON(
            CONFIG_FILE,
            configs
        );

        const panelEmbed =
            createEmbed({
                title:
                    "RSA Support",
                description:
                    "Need assistance? Click the button below to open a private support ticket.\n\nA member of the support team will assist you as soon as possible.",
                footer:
                    "Roblox Schools Association"
            });

        const button =
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(
                            "ticket_create"
                        )
                        .setLabel(
                            "Create Ticket"
                        )
                        .setStyle(
                            ButtonStyle.Primary
                        )
                );

        await panel.send({
            embeds: [
                panelEmbed
            ],
            components: [
                button
            ]
        });

        const embed =
            createEmbed({
                title:
                    "Ticket System Configured",
                description:
                    `Category: ${category}\nPanel Channel: ${panel}\nLogs Channel: ${logs}\nSupport Role: ${support}`
            });

        return interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }

    /* =====================================================
       TICKET CONFIG
    ===================================================== */

    if (command === "ticketconfig") {

        if (
            !hasPermission(
                interaction,
                PermissionsBitField.Flags.ManageGuild
            )
        ) {

            return interaction.reply({
                content:
                    "You need the Manage Server permission.",
                ephemeral: true
            });
        }

        const ticket =
            configs[
                interaction.guild.id
            ]?.ticket;

        if (!ticket) {

            return interaction.reply({
                content:
                    "The ticket system has not been configured yet.",
                ephemeral: true
            });
        }

        const embed =
            createEmbed({
                title:
                    "Ticket Configuration",
                fields: [
                    {
                        name:
                            "Category",
                        value:
                            `<#${ticket.category}>`
                    },
                    {
                        name:
                            "Panel Channel",
                        value:
                            `<#${ticket.panelChannel}>`
                    },
                    {
                        name:
                            "Logs Channel",
                        value:
                            `<#${ticket.logsChannel}>`
                    },
                    {
                        name:
                            "Support Role",
                        value:
                            `<@&${ticket.supportRole}>`
                    }
                ]
            });

        return interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }
}

/* =========================================================
   EMBED CREATOR
========================================================= */

function buildCreatorEmbed(
    session
) {

    return createEmbed({
        title:
            session.title ||
            "RSA Announcement",

        description:
            session.description ||
            "Use the buttons below to build your embed.",

        footer:
            session.footer ||
            "Roblox Schools Association",

        image:
            session.image ||
            undefined,

        thumbnail:
            session.thumbnail ||
            undefined,

        fields:
            session.fields.length
                ? session.fields
                : undefined
    });
}

async function showEmbedBuilder(
    interaction
) {

    const session =
        embedSessions.get(
            interaction.user.id
        );

    if (!session) {
        return;
    }

    const row1 =
        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId(
                        "embed_title"
                    )
                    .setLabel(
                        "Title"
                    )
                    .setStyle(
                        ButtonStyle.Primary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "embed_description"
                    )
                    .setLabel(
                        "Description"
                    )
                    .setStyle(
                        ButtonStyle.Primary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "embed_extra"
                    )
                    .setLabel(
                        "Images / Footer"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    )
            );

    const row2 =
        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId(
                        "embed_field"
                    )
                    .setLabel(
                        "Add Field"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "embed_preview"
                    )
                    .setLabel(
                        "Preview"
                    )
                    .setStyle(
                        ButtonStyle.Success
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

    const payload = {
        content:
            "### RSA Embed Creator\nCreate a professional RSA embed using the controls below.",
        embeds: [
            buildCreatorEmbed(
                session
            )
        ],
        components: [
            row1,
            row2
        ],
        ephemeral: true
    };

    if (
        interaction.replied ||
        interaction.deferred
    ) {

        return interaction.editReply(
            payload
        );
    }

    return interaction.reply(
        payload
    );
}

/* =========================================================
   BUTTON HANDLER
========================================================= */

async function handleButton(
    interaction
) {

    /* =====================================================
       CREATE TICKET
    ===================================================== */

    if (
        interaction.customId ===
        "ticket_create"
    ) {

        const config =
            configs[
                interaction.guild.id
            ]?.ticket;

        if (!config) {

            return interaction.reply({
                content:
                    "The ticket system has not been configured.",
                ephemeral: true
            });
        }

        await interaction.deferReply({
            ephemeral: true
        });

        const existing =
            interaction.guild.channels.cache.find(
                channel =>
                    channel.type ===
                        ChannelType.GuildText &&
                    channel.topic ===
                        `ticket-owner:${interaction.user.id}`
            );

        if (existing) {

            return interaction.editReply({
                content:
                    `You already have an open ticket: ${existing}`
            });
        }

        const category =
            interaction.guild.channels.cache.get(
                config.category
            );

        const supportRole =
            interaction.guild.roles.cache.get(
                config.supportRole
            );

        if (!category) {

            return interaction.editReply({
                content:
                    "The configured ticket category no longer exists."
            });
        }

        if (!supportRole) {

            return interaction.editReply({
                content:
                    "The configured support role no longer exists."
            });
        }

        const channel =
            await interaction.guild.channels.create({
                name:
                    `ticket-${interaction.user.username
                        .toLowerCase()
                        .replace(
                            /[^a-z0-9]/g,
                            "-"
                        )
                        .slice(0, 20)}`,
                type:
                    ChannelType.GuildText,
                parent:
                    category.id,
                topic:
                    `ticket-owner:${interaction.user.id}`,
                permissionOverwrites: [
                    {
                        id:
                            interaction.guild.roles.everyone.id,
                        deny: [
                            PermissionsBitField.Flags.ViewChannel
                        ]
                    },
                    {
                        id:
                            interaction.user.id,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.SendMessages,
                            PermissionsBitField.Flags.ReadMessageHistory
                        ]
                    },
                    {
                        id:
                            supportRole.id,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.SendMessages,
                            PermissionsBitField.Flags.ReadMessageHistory,
                            PermissionsBitField.Flags.ManageMessages
                        ]
                    },
                    {
                        id:
                            client.user.id,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.SendMessages,
                            PermissionsBitField.Flags.ReadMessageHistory,
                            PermissionsBitField.Flags.ManageChannels,
                            PermissionsBitField.Flags.ManageMessages
                        ]
                    }
                ]
            });

        const embed =
            createEmbed({
                title:
                    "Support Ticket",
                description:
                    `Welcome ${interaction.user}.\n\nPlease explain your enquiry clearly and provide any relevant information. A member of the support team will assist you shortly.`,
                fields: [
                    {
                        name:
                            "Ticket Owner",
                        value:
                            interaction.user.toString()
                    },
                    {
                        name:
                            "Status",
                        value:
                            "Unclaimed"
                    }
                ],
                footer:
                    "Roblox Schools Association"
            });

        const buttons =
            new ActionRowBuilder()
                .addComponents(

                    new ButtonBuilder()
                        .setCustomId(
                            "ticket_claim"
                        )
                        .setLabel(
                            "Claim"
                        )
                        .setStyle(
                            ButtonStyle.Primary
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            "ticket_close"
                        )
                        .setLabel(
                            "Close"
                        )
                        .setStyle(
                            ButtonStyle.Danger
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            "ticket_modpanel"
                        )
                        .setLabel(
                            "Mod Panel"
                        )
                        .setStyle(
                            ButtonStyle.Secondary
                        )
                );

        await channel.send({
            content:
                `${interaction.user} <@&${supportRole.id}>`,
            embeds: [
                embed
            ],
            components: [
                buttons
            ]
        });

        const logChannel =
            interaction.guild.channels.cache.get(
                config.logsChannel
            );

        if (logChannel) {

            const logEmbed =
                createEmbed({
                    title:
                        "Ticket Created",
                    description:
                        `Ticket: ${channel}\nOwner: ${interaction.user}\nCreated by: ${interaction.user}`
                });

            await logChannel.send({
                embeds: [
                    logEmbed
                ]
            }).catch(() => {});
        }

        return interaction.editReply({
            content:
                `Your ticket has been created: ${channel}`
        });
    }

    /* =====================================================
       TICKET CLAIM
    ===================================================== */

    if (
        interaction.customId ===
        "ticket_claim"
    ) {

        if (
            !isTicketStaff(
                interaction
            )
        ) {

            return interaction.reply({
                content:
                    "You do not have permission to claim tickets.",
                ephemeral: true
            });
        }

        const ownerId =
            getTicketOwner(
                interaction.channel
            );

        const embed =
            createEmbed({
                title:
                    "Support Ticket",
                description:
                    ownerId
                        ? `Welcome <@${ownerId}>.\n\nPlease explain your enquiry clearly and provide any relevant information. A member of the support team will assist you shortly.`
                        : "Support ticket.",
                fields: [
                    {
                        name:
                            "Ticket Owner",
                        value:
                            ownerId
                                ? `<@${ownerId}>`
                                : "Unknown"
                    },
                    {
                        name:
                            "Status",
                        value:
                            `Claimed by ${interaction.user}`
                    }
                ]
            });

        const buttons =
            new ActionRowBuilder()
                .addComponents(

                    new ButtonBuilder()
                        .setCustomId(
                            "ticket_unclaim"
                        )
                        .setLabel(
                            "Unclaim"
                        )
                        .setStyle(
                            ButtonStyle.Primary
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            "ticket_close"
                        )
                        .setLabel(
                            "Close"
                        )
                        .setStyle(
                            ButtonStyle.Danger
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            "ticket_modpanel"
                        )
                        .setLabel(
                            "Mod Panel"
                        )
                        .setStyle(
                            ButtonStyle.Secondary
                        )
                );

        return interaction.update({
            embeds: [
                embed
            ],
            components: [
                buttons
            ]
        });
    }

    /* =====================================================
       TICKET UNCLAIM
    ===================================================== */

    if (
        interaction.customId ===
        "ticket_unclaim"
    ) {

        if (
            !isTicketStaff(
                interaction
            )
        ) {

            return interaction.reply({
                content:
                    "You do not have permission to unclaim tickets.",
                ephemeral: true
            });
        }

        const ownerId =
            getTicketOwner(
                interaction.channel
            );

        const embed =
            createEmbed({
                title:
                    "Support Ticket",
                description:
                    ownerId
                        ? `Welcome <@${ownerId}>.\n\nPlease explain your enquiry clearly and provide any relevant information. A member of the support team will assist you shortly.`
                        : "Support ticket.",
                fields: [
                    {
                        name:
                            "Ticket Owner",
                        value:
                            ownerId
                                ? `<@${ownerId}>`
                                : "Unknown"
                    },
                    {
                        name:
                            "Status",
                        value:
                            "Unclaimed"
                    }
                ]
            });

        const buttons =
            new ActionRowBuilder()
                .addComponents(

                    new ButtonBuilder()
                        .setCustomId(
                            "ticket_claim"
                        )
                        .setLabel(
                            "Claim"
                        )
                        .setStyle(
                            ButtonStyle.Primary
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            "ticket_close"
                        )
                        .setLabel(
                            "Close"
                        )
                        .setStyle(
                            ButtonStyle.Danger
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            "ticket_modpanel"
                        )
                        .setLabel(
                            "Mod Panel"
                        )
                        .setStyle(
                            ButtonStyle.Secondary
                        )
                );

        return interaction.update({
            embeds: [
                embed
            ],
            components: [
                buttons
            ]
        });
    }

    /* =====================================================
       TICKET CLOSE
    ===================================================== */

    if (
        interaction.customId ===
        "ticket_close"
    ) {

        if (
            !isTicketStaff(
                interaction
            )
        ) {

            const ownerId =
                getTicketOwner(
                    interaction.channel
                );

            if (
                ownerId !==
                interaction.user.id
            ) {

                return interaction.reply({
                    content:
                        "You do not have permission to close this ticket.",
                    ephemeral: true
                });
            }
        }

        await closeTicket(
            interaction
        );

        return;
    }

    /* =====================================================
       TICKET MOD PANEL
    ===================================================== */

    if (
        interaction.customId ===
        "ticket_modpanel"
    ) {

        if (
            !isTicketStaff(
                interaction
            )
        ) {

            return interaction.reply({
                content:
                    "You do not have permission to use the moderator panel.",
                ephemeral: true
            });
        }

        const row1 =
            new ActionRowBuilder()
                .addComponents(

                    new ButtonBuilder()
                        .setCustomId(
                            "ticket_rename"
                        )
                        .setLabel(
                            "Rename"
                        )
                        .setStyle(
                            ButtonStyle.Primary
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            "ticket_unclaim"
                        )
                        .setLabel(
                            "Unclaim"
                        )
                        .setStyle(
                            ButtonStyle.Secondary
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            "ticket_adduser"
                        )
                        .setLabel(
                            "Add User"
                        )
                        .setStyle(
                            ButtonStyle.Secondary
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            "ticket_removeuser"
                        )
                        .setLabel(
                            "Remove User"
                        )
                        .setStyle(
                            ButtonStyle.Secondary
                        )
                );

        const row2 =
            new ActionRowBuilder()
                .addComponents(

                    new ButtonBuilder()
                        .setCustomId(
                            "ticket_close"
                        )
                        .setLabel(
                            "Close Ticket"
                        )
                        .setStyle(
                            ButtonStyle.Danger
                        )
                );

        const embed =
            createEmbed({
                title:
                    "Ticket Moderator Panel",
                description:
                    "Use the controls below to manage this ticket."
            });

        return interaction.reply({
            embeds: [
                embed
            ],
            components: [
                row1,
                row2
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       TICKET RENAME
    ===================================================== */

    if (
        interaction.customId ===
        "ticket_rename"
    ) {

        if (
            !isTicketStaff(
                interaction
            )
        ) {

            return interaction.reply({
                content:
                    "You do not have permission to rename tickets.",
                ephemeral: true
            });
        }

        const modal =
            new ModalBuilder()
                .setCustomId(
                    "modal_ticket_rename"
                )
                .setTitle(
                    "Rename Ticket"
                );

        const input =
            new TextInputBuilder()
                .setCustomId(
                    "ticket_name"
                )
                .setLabel(
                    "New Ticket Name"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(true)
                .setMaxLength(90)
                .setValue(
                    interaction.channel.name
                );

        modal.addComponents(
            new ActionRowBuilder()
                .addComponents(
                    input
                )
        );

        return interaction.showModal(
            modal
        );
    }

    /* =====================================================
       TICKET ADD USER
    ===================================================== */

    if (
        interaction.customId ===
        "ticket_adduser"
    ) {

        if (
            !isTicketStaff(
                interaction
            )
        ) {

            return interaction.reply({
                content:
                    "You do not have permission to manage ticket members.",
                ephemeral: true
            });
        }

        const modal =
            new ModalBuilder()
                .setCustomId(
                    "modal_ticket_adduser"
                )
                .setTitle(
                    "Add User"
                );

        const input =
            new TextInputBuilder()
                .setCustomId(
                    "user_id"
                )
                .setLabel(
                    "User ID"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(true)
                .setMaxLength(30);

        modal.addComponents(
            new ActionRowBuilder()
                .addComponents(
                    input
                )
        );

        return interaction.showModal(
            modal
        );
    }

    /* =====================================================
       TICKET REMOVE USER
    ===================================================== */

    if (
        interaction.customId ===
        "ticket_removeuser"
    ) {

        if (
            !isTicketStaff(
                interaction
            )
        ) {

            return interaction.reply({
                content:
                    "You do not have permission to manage ticket members.",
                ephemeral: true
            });
        }

        const modal =
            new ModalBuilder()
                .setCustomId(
                    "modal_ticket_removeuser"
                )
                .setTitle(
                    "Remove User"
                );

        const input =
            new TextInputBuilder()
                .setCustomId(
                    "user_id"
                )
                .setLabel(
                    "User ID"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(true)
                .setMaxLength(30);

        modal.addComponents(
            new ActionRowBuilder()
                .addComponents(
                    input
                )
        );

        return interaction.showModal(
            modal
        );
    }

    /* =====================================================
       EMBED BUTTONS
    ===================================================== */

    if (
        !interaction.customId.startsWith(
            "embed_"
        )
    ) {
        return;
    }

    const session =
        embedSessions.get(
            interaction.user.id
        );

    if (!session) {

        return interaction.reply({
            content:
                "Your embed session has expired. Run `/embed` again.",
            ephemeral: true
        });
    }

    if (
        interaction.customId ===
        "embed_title"
    ) {

        return showSingleModal(
            interaction,
            "modal_title",
            "Embed Title",
            "title",
            "Title",
            TextInputStyle.Short,
            session.title
        );
    }

    if (
        interaction.customId ===
        "embed_description"
    ) {

        return showSingleModal(
            interaction,
            "modal_description",
            "Embed Description",
            "description",
            "Description",
            TextInputStyle.Paragraph,
            session.description
        );
    }

    if (
        interaction.customId ===
        "embed_extra"
    ) {

        const modal =
            new ModalBuilder()
                .setCustomId(
                    "modal_extra"
                )
                .setTitle(
                    "Images and Footer"
                );

        const footer =
            new TextInputBuilder()
                .setCustomId(
                    "footer"
                )
                .setLabel(
                    "Footer"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(false)
                .setValue(
                    session.footer ||
                        ""
                );

        const image =
            new TextInputBuilder()
                .setCustomId(
                    "image"
                )
                .setLabel(
                    "Image URL"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(false)
                .setValue(
                    session.image ||
                        ""
                );

        const thumbnail =
            new TextInputBuilder()
                .setCustomId(
                    "thumbnail"
                )
                .setLabel(
                    "Thumbnail URL"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(false)
                .setValue(
                    session.thumbnail ||
                        ""
                );

        modal.addComponents(

            new ActionRowBuilder()
                .addComponents(
                    footer
                ),

            new ActionRowBuilder()
                .addComponents(
                    image
                ),

            new ActionRowBuilder()
                .addComponents(
                    thumbnail
                )
        );

        return interaction.showModal(
            modal
        );
    }

    if (
        interaction.customId ===
        "embed_field"
    ) {

        const modal =
            new ModalBuilder()
                .setCustomId(
                    "modal_field"
                )
                .setTitle(
                    "Add Embed Field"
                );

        const name =
            new TextInputBuilder()
                .setCustomId(
                    "name"
                )
                .setLabel(
                    "Field Name"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setRequired(true)
                .setMaxLength(256);

        const value =
            new TextInputBuilder()
                .setCustomId(
                    "value"
                )
                .setLabel(
                    "Field Value"
                )
                .setStyle(
                    TextInputStyle.Paragraph
                )
                .setRequired(true)
                .setMaxLength(1024);

        modal.addComponents(

            new ActionRowBuilder()
                .addComponents(
                    name
                ),

            new ActionRowBuilder()
                .addComponents(
                    value
                )
        );

        return interaction.showModal(
            modal
        );
    }

    if (
        interaction.customId ===
        "embed_preview"
    ) {

        return interaction.reply({
            content:
                "Embed Preview",
            embeds: [
                buildCreatorEmbed(
                    session
                )
            ],
            ephemeral: true
        });
    }

    if (
        interaction.customId ===
        "embed_send"
    ) {

        await interaction.channel.send({
            embeds: [
                buildCreatorEmbed(
                    session
                )
            ]
        });

        embedSessions.delete(
            interaction.user.id
        );

        return interaction.update({
            content:
                "Embed sent successfully.",
            embeds: [],
            components: []
        });
    }

    if (
        interaction.customId ===
        "embed_cancel"
    ) {

        embedSessions.delete(
            interaction.user.id
        );

        return interaction.update({
            content:
                "Embed creation cancelled.",
            embeds: [],
            components: []
        });
    }
}

/* =========================================================
   TICKET FUNCTIONS
========================================================= */

function getTicketOwner(
    channel
) {

    if (!channel?.topic) {
        return null;
    }

    const match =
        channel.topic.match(
            /ticket-owner:(\d+)/
        );

    return match
        ? match[1]
        : null;
}

async function closeTicket(
    interaction
) {

    const channel =
        interaction.channel;

    const ownerId =
        getTicketOwner(
            channel
        );

    const config =
        configs[
            interaction.guild.id
        ]?.ticket;

    const messages = [];

    try {

        let lastId;

        while (messages.length < 1000) {

            const fetched =
                await channel.messages.fetch({
                    limit: 100,
                    before: lastId
                });

            if (!fetched.size) {
                break;
            }

            messages.push(
                ...fetched.values()
            );

            lastId =
                fetched.last().id;

            if (
                fetched.size < 100
            ) {
                break;
            }
        }

    } catch {
        /* Transcript collection failed. */
    }

    messages.sort(
        (a, b) =>
            a.createdTimestamp -
            b.createdTimestamp
    );

    let transcript =
        `RSA Administrator Ticket Transcript\n`;

    transcript +=
        `Server: ${interaction.guild.name}\n`;

    transcript +=
        `Channel: #${channel.name}\n`;

    transcript +=
        `Ticket Owner: ${ownerId || "Unknown"}\n`;

    transcript +=
        `Closed By: ${interaction.user.tag}\n`;

    transcript +=
        `Closed At: ${new Date().toISOString()}\n`;

    transcript +=
        `\n========================================\n\n`;

    for (
        const message of messages
    ) {

        const timestamp =
            new Date(
                message.createdTimestamp
            ).toISOString();

        const author =
            message.author
                ? message.author.tag
                : "Unknown";

        let content =
            message.content ||
            "[No text content]";

        if (
            message.attachments.size
        ) {

            content +=
                ` | Attachments: ${[
                    ...message.attachments.values()
                ]
                    .map(
                        attachment =>
                            attachment.url
                    )
                    .join(", ")}`;
        }

        transcript +=
            `[${timestamp}] ${author}: ${content}\n`;
    }

    if (config?.logsChannel) {

        const logsChannel =
            interaction.guild.channels.cache.get(
                config.logsChannel
            );

        if (logsChannel) {

            const logEmbed =
                createEmbed({
                    title:
                        "Ticket Closed",
                    description:
                        `Ticket: #${channel.name}\nOwner: ${
                            ownerId
                                ? `<@${ownerId}>`
                                : "Unknown"
                        }\nClosed by: ${interaction.user}`
                });

            const attachment =
                new AttachmentBuilder(
                    Buffer.from(
                        transcript,
                        "utf8"
                    ),
                    {
                        name:
                            `${channel.name}-transcript.txt`
                    }
                );

            await logsChannel.send({
                embeds: [
                    logEmbed
                ],
                files: [
                    attachment
                ]
            }).catch(() => {});
        }
    }

    await interaction.reply({
        content:
            "This ticket will be closed shortly."
    });

    setTimeout(
        async () => {

            await channel.delete(
                `Ticket closed by ${interaction.user.tag}`
            ).catch(() => {});

        },
        1500
    );
}

/* =========================================================
   MODALS
========================================================= */

async function showSingleModal(
    interaction,
    customId,
    modalTitle,
    inputId,
    label,
    style,
    value
) {

    const modal =
        new ModalBuilder()
            .setCustomId(
                customId
            )
            .setTitle(
                modalTitle
            );

    const input =
        new TextInputBuilder()
            .setCustomId(
                inputId
            )
            .setLabel(
                label
            )
            .setStyle(
                style
            )
            .setRequired(false)
            .setMaxLength(
                style ===
                    TextInputStyle.Paragraph
                    ? 4000
                    : 256
            );

    if (value) {

        input.setValue(
            value.slice(
                0,
                style ===
                    TextInputStyle.Paragraph
                    ? 4000
                    : 256
            )
        );
    }

    modal.addComponents(
        new ActionRowBuilder()
            .addComponents(
                input
            )
    );

    return interaction.showModal(
        modal
    );
}

async function handleModal(
    interaction
) {

    /* =====================================================
       TICKET RENAME
    ===================================================== */

    if (
        interaction.customId ===
        "modal_ticket_rename"
    ) {

        if (
            !isTicketStaff(
                interaction
            )
        ) {

            return interaction.reply({
                content:
                    "You do not have permission to rename tickets.",
                ephemeral: true
            });
        }

        const name =
            interaction.fields.getTextInputValue(
                "ticket_name"
            )
                .toLowerCase()
                .replace(
                    /[^a-z0-9-_]/g,
                    "-"
                )
                .slice(
                    0,
                    90
                );

        await interaction.channel.setName(
            name
        );

        return interaction.reply({
            content:
                `Ticket renamed to **${name}**.`,
            ephemeral: true
        });
    }

    /* =====================================================
       ADD USER
    ===================================================== */

    if (
        interaction.customId ===
        "modal_ticket_adduser"
    ) {

        if (
            !isTicketStaff(
                interaction
            )
        ) {

            return interaction.reply({
                content:
                    "You do not have permission to manage ticket members.",
                ephemeral: true
            });
        }

        const userId =
            interaction.fields.getTextInputValue(
                "user_id"
            ).trim();

        const member =
            await interaction.guild.members
                .fetch(userId)
                .catch(() => null);

        if (!member) {

            return interaction.reply({
                content:
                    "I could not find that member.",
                ephemeral: true
            });
        }

        await interaction.channel.permissionOverwrites.edit(
            member.id,
            {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            }
        );

        return interaction.reply({
            content:
                `${member} has been added to this ticket.`,
            ephemeral: true
        });
    }

    /* =====================================================
       REMOVE USER
    ===================================================== */

    if (
        interaction.customId ===
        "modal_ticket_removeuser"
    ) {

        if (
            !isTicketStaff(
                interaction
            )
        ) {

            return interaction.reply({
                content:
                    "You do not have permission to manage ticket members.",
                ephemeral: true
            });
        }

        const userId =
            interaction.fields.getTextInputValue(
                "user_id"
            ).trim();

        const member =
            await interaction.guild.members
                .fetch(userId)
                .catch(() => null);

        if (!member) {

            return interaction.reply({
                content:
                    "I could not find that member.",
                ephemeral: true
            });
        }

        const ownerId =
            getTicketOwner(
                interaction.channel
            );

        if (
            ownerId ===
            member.id
        ) {

            return interaction.reply({
                content:
                    "The ticket owner cannot be removed from their own ticket.",
                ephemeral: true
            });
        }

        await interaction.channel.permissionOverwrites.delete(
            member.id
        ).catch(() => {});

        return interaction.reply({
            content:
                `${member} has been removed from this ticket.`,
            ephemeral: true
        });
    }

    /* =====================================================
       EMBED MODALS
    ===================================================== */

    const session =
        embedSessions.get(
            interaction.user.id
        );

    if (!session) {

        return interaction.reply({
            content:
                "Your embed session has expired.",
            ephemeral: true
        });
    }

    if (
        interaction.customId ===
        "modal_title"
    ) {

        session.title =
            interaction.fields.getTextInputValue(
                "title"
            );
    }

    if (
        interaction.customId ===
        "modal_description"
    ) {

        session.description =
            interaction.fields.getTextInputValue(
                "description"
            );
    }

    if (
        interaction.customId ===
        "modal_extra"
    ) {

        session.footer =
            interaction.fields.getTextInputValue(
                "footer"
            );

        session.image =
            interaction.fields.getTextInputValue(
                "image"
            );

        session.thumbnail =
            interaction.fields.getTextInputValue(
                "thumbnail"
            );
    }

    if (
        interaction.customId ===
        "modal_field"
    ) {

        if (
            session.fields.length >=
            25
        ) {

            return interaction.reply({
                content:
                    "Discord allows a maximum of 25 embed fields.",
                ephemeral: true
            });
        }

        const name =
            interaction.fields.getTextInputValue(
                "name"
            );

        const value =
            interaction.fields.getTextInputValue(
                "value"
            );

        session.fields.push({
            name,
            value,
            inline: false
        });
    }

    await interaction.reply({
        content:
            "Updated. Your embed creator is still open.",
        ephemeral: true
    });

    setTimeout(
        async () => {

            try {

                const messages =
                    await interaction.channel.messages.fetch({
                        limit: 10
                    });

                const creatorMessage =
                    messages.find(
                        message =>
                            message.author.id ===
                                client.user.id &&
                            message.components.length >
                                0 &&
                            message.components.some(
                                row =>
                                    row.components.some(
                                        component =>
                                            component.customId ===
                                            "embed_send"
                                    )
                            )
                    );

                if (!creatorMessage) {
                    return;
                }

                await creatorMessage.edit({
                    embeds: [
                        buildCreatorEmbed(
                            session
                        )
                    ]
                });

            } catch {
                /* Ignore refresh errors. */
            }

        },
        250
    );
}

/* =========================================================
   MEMBER EVENTS
========================================================= */

client.on(
    "guildMemberAdd",
    async member => {

        await logAction(
            member.guild,
            "Member Joined",
            `Member: ${member.user.tag}\nID: ${member.id}`
        );
    }
);

client.on(
    "guildMemberRemove",
    async member => {

        await logAction(
            member.guild,
            "Member Left",
            `Member: ${member.user.tag}\nID: ${member.id}`
        );
    }
);

client.on(
    "messageDelete",
    async message => {

        if (
            !message.guild ||
            message.author?.bot
        ) {
            return;
        }

        await logAction(
            message.guild,
            "Message Deleted",
            `Author: ${message.author?.tag || "Unknown"}\nChannel: ${message.channel}\n\n${
                message.content?.slice(
                    0,
                    1500
                ) ||
                "No text content."
            }`
        );
    }
);

/* =========================================================
   ERROR HANDLING
========================================================= */

client.on(
    "error",
    error => {

        console.error(
            "Discord client error:",
            error
        );
    }
);

process.on(
    "unhandledRejection",
    error => {

        console.error(
            "Unhandled promise rejection:",
            error
        );
    }
);

process.on(
    "uncaughtException",
    error => {

        console.error(
            "Uncaught exception:",
            error
        );
    }
);

/* =========================================================
   LOGIN
========================================================= */

client.login(
    TOKEN
);
