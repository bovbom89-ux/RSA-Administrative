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
    PermissionFlagsBits
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

const WARNINGS_FILE =
    path.join(DATA_DIR, "warnings.json");

const CONFIG_FILE =
    path.join(DATA_DIR, "config.json");

function loadJSON(file, fallback) {
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
            JSON.stringify(data, null, 2)
        );
    } catch (error) {
        console.error(
            `Could not save ${file}:`,
            error
        );
    }
}

const warnings =
    loadJSON(WARNINGS_FILE, {});

const configs =
    loadJSON(CONFIG_FILE, {});

const embedSessions =
    new Map();

/* =========================================================
   EMBED HELPERS
========================================================= */

function brandedTitle(title) {
    return `${RSA_LOGO} ${title}`;
}

function createEmbed(options = {}) {
    const embed =
        new EmbedBuilder()
            .setColor(EMBED_COLOUR);

    if (options.title) {
        embed.setTitle(
            brandedTitle(options.title)
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
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("logs")
        .setDescription(
            "View the configured log channel."
        ),

    /* =====================================================
       TICKET COMMAND
    ===================================================== */

    new SlashCommandBuilder()
        .setName("ticket")
        .setDescription(
            "Manage the RSA ticket system."
        )
        .addSubcommand(sub =>
            sub
                .setName("setup")
                .setDescription(
                    "Configure the ticket system."
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
                        .setName("panel_channel")
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
                        .setName("logs_channel")
                        .setDescription(
                            "Channel where ticket logs will be sent."
                        )
                        .addChannelTypes(
                            ChannelType.GuildText
                        )
                        .setRequired(true)
                )
                .addRoleOption(option =>
                    option
                        .setName("staff_role")
                        .setDescription(
                            "Role that can manage tickets."
                        )
                        .setRequired(true)
                )
        )

        .addSubcommand(sub =>
            sub
                .setName("panel")
                .setDescription(
                    "Send the ticket panel."
                )
        )

        .addSubcommand(sub =>
            sub
                .setName("close")
                .setDescription(
                    "Close the current ticket."
                )
        )

].map(command => command.toJSON());

/* =========================================================
   COMMAND REGISTRATION
========================================================= */

async function registerCommands() {

    const rest =
        new REST({
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
        configs[interaction.guild.id];

    if (!config?.ticket?.staffRole) {
        return false;
    }

    return interaction.member.roles.cache.has(
        config.ticket.staffRole
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
   GENERAL LOGGING
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
   TICKET LOGGING
========================================================= */

async function ticketLog(
    guild,
    title,
    description
) {

    const config =
        configs[guild.id];

    const channel =
        guild.channels.cache.get(
            config?.ticket?.logsChannel
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

            } else if (
                interaction.isButton()
            ) {

                await handleButton(
                    interaction
                );

            } else if (
                interaction.isModalSubmit()
            ) {

                await handleModal(
                    interaction
                );
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

                await interaction
                    .followUp(response)
                    .catch(() => {});

            } else {

                await interaction
                    .reply(response)
                    .catch(() => {});
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

    /* HELP */

    if (command === "help") {

        const embed =
            createEmbed({
                title:
                    "RSA Administrator",
                description:
                    "Administration, moderation and ticket management tools for the Roblox Schools Association.",
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
                            "`/ticket setup` `/ticket panel` `/ticket close`"
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

    /* PING */

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

    /* BOT INFO */

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

    /* SERVER INFO */

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
                            `<@${guild.ownerId}>`,
                        inline: true
                    },
                    {
                        name:
                            "Created",
                        value:
                            `<t:${Math.floor(
                                guild.createdTimestamp /
                                1000
                            )}:D>`,
                        inline: true
                    }
                ]
            });

        return interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }

    /* USER INFO */

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

    /* BAN */

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

    /* KICK */

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

        await member.kick(reason);

        await logAction(
            interaction.guild,
            "Member Kicked",
            `Member: ${user.tag}\nModerator: ${interaction.user}\nReason: ${reason}`
        );

        return interaction.reply(
            `**${user.tag}** has been kicked.`
        );
    }

    /* TIMEOUT */

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

    /* UNTIMEOUT */

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

    /* WARN */

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

    /* WARNINGS */

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

    /* CLEAR WARNINGS */

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

    /* PURGE */

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

    /* LOCK */

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

    /* UNLOCK */

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

    /* SLOWMODE */

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

    /* ROLE */

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

    /* ANNOUNCE */

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

    /* EMBED */

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
                fields: []
            }
        );

        return showEmbedBuilder(
            interaction
        );
    }

    /* SET LOGS */

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
            ...(configs[
                interaction.guild.id
            ] || {}),
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

    /* LOGS */

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
       TICKETS
    ===================================================== */

    if (command === "ticket") {

        const subcommand =
            interaction.options.getSubcommand();

        /* TICKET SETUP */

        if (
            subcommand === "setup"
        ) {

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

            const panelChannel =
                interaction.options.getChannel(
                    "panel_channel"
                );

            const logsChannel =
                interaction.options.getChannel(
                    "logs_channel"
                );

            const staffRole =
                interaction.options.getRole(
                    "staff_role"
                );

            configs[
                interaction.guild.id
            ] = {
                ...(configs[
                    interaction.guild.id
                ] || {}),
                ticket: {
                    enabled: true,
                    category:
                        category.id,
                    panelChannel:
                        panelChannel.id,
                    logsChannel:
                        logsChannel.id,
                    staffRole:
                        staffRole.id
                }
            };

            saveJSON(
                CONFIG_FILE,
                configs
            );

            const embed =
                createEmbed({
                    title:
                        "Ticket System Configured",
                    description:
                        "The RSA ticket system has been configured successfully.",
                    fields: [
                        {
                            name:
                                "Category",
                            value:
                                category.toString()
                        },
                        {
                            name:
                                "Panel Channel",
                            value:
                                panelChannel.toString()
                        },
                        {
                            name:
                                "Logs Channel",
                            value:
                                logsChannel.toString()
                        },
                        {
                            name:
                                "Staff Role",
                            value:
                                staffRole.toString()
                        }
                    ]
                });

            return interaction.reply({
                embeds: [embed],
                ephemeral: true
            });
        }

        /* TICKET PANEL */

        if (
            subcommand === "panel"
        ) {

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

            const config =
                configs[
                    interaction.guild.id
                ]?.ticket;

            if (!config?.enabled) {
                return interaction.reply({
                    content:
                        "The ticket system has not been configured. Run `/ticket setup` first.",
                    ephemeral: true
                });
            }

            const panelChannel =
                interaction.guild.channels.cache.get(
                    config.panelChannel
                );

            if (!panelChannel) {
                return interaction.reply({
                    content:
                        "The configured ticket panel channel no longer exists.",
                    ephemeral: true
                });
            }

            const embed =
                createEmbed({
                    title:
                        "Customer Support",
                    description:
                        "Need assistance? Click the button below to open a private support ticket with the RSA team.",
                    footer:
                        "Roblox Schools Association"
                });

            const row =
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

            await panelChannel.send({
                embeds: [embed],
                components: [row]
            });

            return interaction.reply({
                content:
                    `Ticket panel sent to ${panelChannel}.`,
                ephemeral: true
            });
        }

        /* TICKET CLOSE COMMAND */

        if (
            subcommand === "close"
        ) {

            if (
                !interaction.channel.name.startsWith(
                    "ticket-"
                )
            ) {
                return interaction.reply({
                    content:
                        "This command can only be used inside a ticket.",
                    ephemeral: true
                });
            }

            if (
                !isTicketStaff(
                    interaction
                ) &&
                !interaction.member.permissions.has(
                    PermissionsBitField.Flags.ManageChannels
                )
            ) {
                return interaction.reply({
                    content:
                        "You do not have permission to close this ticket.",
                    ephemeral: true
                });
            }

            return closeTicket(
                interaction
            );
        }
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

    const id =
        interaction.customId;

    /* =====================================================
       CREATE TICKET
    ===================================================== */

    if (
        id === "ticket_create"
    ) {

        const config =
            configs[
                interaction.guild.id
            ]?.ticket;

        if (!config?.enabled) {
            return interaction.reply({
                content:
                    "The ticket system is currently disabled.",
                ephemeral: true
            });
        }

        const existing =
            interaction.guild.channels.cache.find(
                channel =>
                    channel.name ===
                    `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 20)}`
            );

        if (existing) {
            return interaction.reply({
                content:
                    `You already have a ticket: ${existing}`,
                ephemeral: true
            });
        }

        const category =
            interaction.guild.channels.cache.get(
                config.category
            );

        const staffRole =
            interaction.guild.roles.cache.get(
                config.staffRole
            );

        if (!category) {
            return interaction.reply({
                content:
                    "The ticket category no longer exists.",
                ephemeral: true
            });
        }

        if (!staffRole) {
            return interaction.reply({
                content:
                    "The configured staff role no longer exists.",
                ephemeral: true
            });
        }

        const safeName =
            interaction.user.username
                .toLowerCase()
                .replace(
                    /[^a-z0-9]/g,
                    "-"
                )
                .slice(
                    0,
                    20
                );

        const channel =
            await interaction.guild.channels.create({
                name:
                    `ticket-${safeName}`,
                type:
                    ChannelType.GuildText,
                parent:
                    category.id,
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
                            interaction.client.user.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory,
                            PermissionFlagsBits.ManageChannels,
                            PermissionFlagsBits.ManageMessages
                        ]
                    }
                ]
            });

        const embed =
            createEmbed({
                title:
                    "Ticket Opened",
                description:
                    `Welcome <@${interaction.user.id}>.\n\nA member of the RSA team will be with you shortly. Please explain your enquiry clearly and provide any relevant information.`,
                fields: [
                    {
                        name:
                            "Opened By",
                        value:
                            interaction.user.toString(),
                        inline: true
                    },
                    {
                        name:
                            "Status",
                        value:
                            "Unclaimed",
                        inline: true
                    }
                ],
                footer:
                    "Roblox Schools Association"
            });

        const row =
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
                `<@${interaction.user.id}> <@&${staffRole.id}>`,
            embeds: [embed],
            components: [row]
        });

        await ticketLog(
            interaction.guild,
            "Ticket Created",
            `Ticket: ${channel}\nOpened by: ${interaction.user}\nChannel ID: ${channel.id}`
        );

        return interaction.reply({
            content:
                `Your ticket has been created: ${channel}`,
            ephemeral: true
        });
    }

    /* =====================================================
       TICKET CLAIM
    ===================================================== */

    if (
        id === "ticket_claim"
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

        const messages =
            await interaction.channel.messages.fetch({
                limit: 10
            });

        const ticketMessage =
            messages.find(
                message =>
                    message.author.id ===
                    client.user.id &&
                    message.components.some(
                        row =>
                            row.components.some(
                                component =>
                                    component.customId ===
                                    "ticket_claim"
                            )
                    )
            );

        if (!ticketMessage) {
            return interaction.reply({
                content:
                    "Ticket information could not be found.",
                ephemeral: true
            });
        }

        const embed =
            EmbedBuilder.from(
                ticketMessage.embeds[0]
            );

        const fields =
            embed.data.fields || [];

        const statusIndex =
            fields.findIndex(
                field =>
                    field.name ===
                    "Status"
            );

        if (
            statusIndex !== -1
        ) {
            fields[
                statusIndex
            ].value =
                `Claimed by ${interaction.user}`;
        }

        embed.setFields(
            fields
        );

        const row =
            new ActionRowBuilder()
                .addComponents(

                    new ButtonBuilder()
                        .setCustomId(
                            "ticket_claim"
                        )
                        .setLabel(
                            "Claimed"
                        )
                        .setStyle(
                            ButtonStyle.Success
                        )
                        .setDisabled(true),

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

        await ticketMessage.edit({
            embeds: [embed],
            components: [row]
        });

        await ticketLog(
            interaction.guild,
            "Ticket Claimed",
            `Ticket: ${interaction.channel}\nClaimed by: ${interaction.user}`
        );

        return interaction.reply({
            content:
                "You have claimed this ticket.",
            ephemeral: true
        });
    }

    /* =====================================================
       TICKET CLOSE
    ===================================================== */

    if (
        id === "ticket_close"
    ) {

        if (
            !isTicketStaff(
                interaction
            ) &&
            !interaction.member.permissions.has(
                PermissionsBitField.Flags.ManageChannels
            )
        ) {
            return interaction.reply({
                content:
                    "You do not have permission to close this ticket.",
                ephemeral: true
            });
        }

        return closeTicket(
            interaction
        );
    }

    /* =====================================================
       MOD PANEL
    ===================================================== */

    if (
        id === "ticket_modpanel"
    ) {

        if (
            !isTicketStaff(
                interaction
            )
        ) {
            return interaction.reply({
                content:
                    "The Mod Panel is restricted to ticket staff.",
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
                            "ticket_add"
                        )
                        .setLabel(
                            "Add Member"
                        )
                        .setStyle(
                            ButtonStyle.Secondary
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            "ticket_remove"
                        )
                        .setLabel(
                            "Remove Member"
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
                            "ticket_lock"
                        )
                        .setLabel(
                            "Lock"
                        )
                        .setStyle(
                            ButtonStyle.Secondary
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            "ticket_unlock"
                        )
                        .setLabel(
                            "Unlock"
                        )
                        .setStyle(
                            ButtonStyle.Success
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            "ticket_transcript"
                        )
                        .setLabel(
                            "Transcript"
                        )
                        .setStyle(
                            ButtonStyle.Secondary
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            "ticket_delete"
                        )
                        .setLabel(
                            "Delete"
                        )
                        .setStyle(
                            ButtonStyle.Danger
                        )
                );

        const embed =
            createEmbed({
                title:
                    "Ticket Mod Panel",
                description:
                    "Use the controls below to manage this ticket."
            });

        return interaction.reply({
            embeds: [embed],
            components: [
                row1,
                row2
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       RENAME
    ===================================================== */

    if (
        id === "ticket_rename"
    ) {

        if (
            !isTicketStaff(
                interaction
            )
        ) {
            return interaction.reply({
                content:
                    "Staff only.",
                ephemeral: true
            });
        }

        const modal =
            new ModalBuilder()
                .setCustomId(
                    "ticket_rename_modal"
                )
                .setTitle(
                    "Rename Ticket"
                );

        const input =
            new TextInputBuilder()
                .setCustomId(
                    "name"
                )
                .setLabel(
                    "New ticket name"
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
                .addComponents(input)
        );

        return interaction.showModal(
            modal
        );
    }

    /* =====================================================
       UNCLAIM
    ===================================================== */

    if (
        id === "ticket_unclaim"
    ) {

        if (
            !isTicketStaff(
                interaction
            )
        ) {
            return interaction.reply({
                content:
                    "Staff only.",
                ephemeral: true
            });
        }

        const messages =
            await interaction.channel.messages.fetch({
                limit: 10
            });

        const ticketMessage =
            messages.find(
                message =>
                    message.author.id ===
                    client.user.id &&
                    message.components.some(
                        row =>
                            row.components.some(
                                component =>
                                    component.customId ===
                                    "ticket_close"
                            )
                    )
            );

        if (ticketMessage) {

            const embed =
                EmbedBuilder.from(
                    ticketMessage.embeds[0]
                );

            const fields =
                embed.data.fields || [];

            const index =
                fields.findIndex(
                    field =>
                        field.name ===
                        "Status"
                );

            if (index !== -1) {
                fields[index].value =
                    "Unclaimed";
            }

            embed.setFields(
                fields
            );

            const row =
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

            await ticketMessage.edit({
                embeds: [embed],
                components: [row]
            });
        }

        await ticketLog(
            interaction.guild,
            "Ticket Unclaimed",
            `Ticket: ${interaction.channel}\nUnclaimed by: ${interaction.user}`
        );

        return interaction.reply({
            content:
                "The ticket has been unclaimed.",
            ephemeral: true
        });
    }

    /* =====================================================
       ADD MEMBER
    ===================================================== */

    if (
        id === "ticket_add"
    ) {

        if (
            !isTicketStaff(
                interaction
            )
        ) {
            return interaction.reply({
                content:
                    "Staff only.",
                ephemeral: true
            });
        }

        return showUserModal(
            interaction,
            "ticket_add_modal",
            "Add Member",
            "User ID or mention"
        );
    }

    /* =====================================================
       REMOVE MEMBER
    ===================================================== */

    if (
        id === "ticket_remove"
    ) {

        if (
            !isTicketStaff(
                interaction
            )
        ) {
            return interaction.reply({
                content:
                    "Staff only.",
                ephemeral: true
            });
        }

        return showUserModal(
            interaction,
            "ticket_remove_modal",
            "Remove Member",
            "User ID or mention"
        );
    }

    /* =====================================================
       LOCK
    ===================================================== */

    if (
        id === "ticket_lock"
    ) {

        if (
            !isTicketStaff(
                interaction
            )
        ) {
            return interaction.reply({
                content:
                    "Staff only.",
                ephemeral: true
            });
        }

        await interaction.channel.permissionOverwrites.edit(
            interaction.guild.roles.everyone,
            {
                ViewChannel: true,
                SendMessages: false
            }
        );

        await ticketLog(
            interaction.guild,
            "Ticket Locked",
            `Ticket: ${interaction.channel}\nLocked by: ${interaction.user}`
        );

        return interaction.reply({
            content:
                "The ticket has been locked.",
            ephemeral: true
        });
    }

    /* =====================================================
       UNLOCK
    ===================================================== */

    if (
        id === "ticket_unlock"
    ) {

        if (
            !isTicketStaff(
                interaction
            )
        ) {
            return interaction.reply({
                content:
                    "Staff only.",
                ephemeral: true
            });
        }

        const config =
            configs[
                interaction.guild.id
            ]?.ticket;

        const staffRole =
            interaction.guild.roles.cache.get(
                config?.staffRole
            );

        if (staffRole) {

            await interaction.channel.permissionOverwrites.edit(
                staffRole,
                {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true
                }
            );
        }

        return interaction.reply({
            content:
                "The ticket has been unlocked.",
            ephemeral: true
        });
    }

    /* =====================================================
       TRANSCRIPT
    ===================================================== */

    if (
        id === "ticket_transcript"
    ) {

        if (
            !isTicketStaff(
                interaction
            )
        ) {
            return interaction.reply({
                content:
                    "Staff only.",
                ephemeral: true
            });
        }

        const messages =
            await interaction.channel.messages.fetch({
                limit: 100
            });

        const sorted =
            [...messages.values()]
                .sort(
                    (a, b) =>
                        a.createdTimestamp -
                        b.createdTimestamp
                );

        let transcript =
            `RSA Ticket Transcript\n`;

        transcript +=
            `Channel: ${interaction.channel.name}\n`;

        transcript +=
            `Generated by: ${interaction.user.tag}\n\n`;

        for (
            const message of sorted
        ) {

            transcript +=
                `[${new Date(
                    message.createdTimestamp
                ).toISOString()}] ` +
                `${message.author.tag}: ` +
                `${message.content || "[Embed/Attachment]"}\n`;
        }

        const buffer =
            Buffer.from(
                transcript,
                "utf8"
            );

        return interaction.reply({
            content:
                "Ticket transcript generated.",
            files: [
                {
                    attachment:
                        buffer,
                    name:
                        `${interaction.channel.name}-transcript.txt`
                }
            ],
            ephemeral: true
        });
    }

    /* =====================================================
       DELETE
    ===================================================== */

    if (
        id === "ticket_delete"
    ) {

        if (
            !isTicketStaff(
                interaction
            )
        ) {
            return interaction.reply({
                content:
                    "Staff only.",
                ephemeral: true
            });
        }

        await ticketLog(
            interaction.guild,
            "Ticket Deleted",
            `Ticket: ${interaction.channel.name}\nDeleted by: ${interaction.user}`
        );

        await interaction.reply({
            content:
                "Deleting ticket...",
            ephemeral: true
        });

        setTimeout(
            () =>
                interaction.channel
                    .delete()
                    .catch(() => {}),
            1500
        );

        return;
    }

    /* =====================================================
       EMBED BUTTONS
    ===================================================== */

    if (
        !id.startsWith(
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
        id ===
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
        id ===
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
        id ===
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
        id ===
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
        id ===
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
        id ===
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
        id ===
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
   MODAL HELPERS
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

async function showUserModal(
    interaction,
    customId,
    title,
    label
) {

    const modal =
        new ModalBuilder()
            .setCustomId(
                customId
            )
            .setTitle(
                title
            );

    const input =
        new TextInputBuilder()
            .setCustomId(
                "user"
            )
            .setLabel(
                label
            )
            .setStyle(
                TextInputStyle.Short
            )
            .setRequired(true);

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

/* =========================================================
   MODAL HANDLER
========================================================= */

async function handleModal(
    interaction
) {

    /* RENAME TICKET */

    if (
        interaction.customId ===
        "ticket_rename_modal"
    ) {

        if (
            !isTicketStaff(
                interaction
            )
        ) {
            return interaction.reply({
                content:
                    "Staff only.",
                ephemeral: true
            });
        }

        let name =
            interaction.fields
                .getTextInputValue(
                    "name"
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

        if (!name) {
            return interaction.reply({
                content:
                    "Invalid ticket name.",
                ephemeral: true
            });
        }

        await interaction.channel.setName(
            name
        );

        await ticketLog(
            interaction.guild,
            "Ticket Renamed",
            `New name: ${name}\nChanged by: ${interaction.user}`
        );

        return interaction.reply({
            content:
                `Ticket renamed to **${name}**.`,
            ephemeral: true
        });
    }

    /* ADD MEMBER */

    if (
        interaction.customId ===
        "ticket_add_modal"
    ) {

        if (
            !isTicketStaff(
                interaction
            )
        ) {
            return interaction.reply({
                content:
                    "Staff only.",
                ephemeral: true
            });
        }

        const input =
            interaction.fields
                .getTextInputValue(
                    "user"
                );

        const userId =
            input.replace(
                /[^0-9]/g,
                ""
            );

        const member =
            await interaction.guild.members
                .fetch(userId)
                .catch(() => null);

        if (!member) {
            return interaction.reply({
                content:
                    "Member not found.",
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

        await ticketLog(
            interaction.guild,
            "Member Added",
            `Member: ${member.user.tag}\nTicket: ${interaction.channel}\nAdded by: ${interaction.user}`
        );

        return interaction.reply({
            content:
                `${member} has been added to the ticket.`,
            ephemeral: true
        });
    }

    /* REMOVE MEMBER */

    if (
        interaction.customId ===
        "ticket_remove_modal"
    ) {

        if (
            !isTicketStaff(
                interaction
            )
        ) {
            return interaction.reply({
                content:
                    "Staff only.",
                ephemeral: true
            });
        }

        const input =
            interaction.fields
                .getTextInputValue(
                    "user"
                );

        const userId =
            input.replace(
                /[^0-9]/g,
                ""
            );

        const member =
            await interaction.guild.members
                .fetch(userId)
                .catch(() => null);

        if (!member) {
            return interaction.reply({
                content:
                    "Member not found.",
                ephemeral: true
            });
        }

        await interaction.channel.permissionOverwrites.delete(
            member.id
        ).catch(() => {});

        await ticketLog(
            interaction.guild,
            "Member Removed",
            `Member: ${member.user.tag}\nTicket: ${interaction.channel}\nRemoved by: ${interaction.user}`
        );

        return interaction.reply({
            content:
                `${member} has been removed from the ticket.`,
            ephemeral: true
        });
    }

    /* EMBED CREATOR */

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
            interaction.fields
                .getTextInputValue(
                    "title"
                );
    }

    if (
        interaction.customId ===
        "modal_description"
    ) {

        session.description =
            interaction.fields
                .getTextInputValue(
                    "description"
                );
    }

    if (
        interaction.customId ===
        "modal_extra"
    ) {

        session.footer =
            interaction.fields
                .getTextInputValue(
                    "footer"
                );

        session.image =
            interaction.fields
                .getTextInputValue(
                    "image"
                );

        session.thumbnail =
            interaction.fields
                .getTextInputValue(
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
            interaction.fields
                .getTextInputValue(
                    "name"
                );

        const value =
            interaction.fields
                .getTextInputValue(
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
}

/* =========================================================
   CLOSE TICKET
========================================================= */

async function closeTicket(
    interaction
) {

    const channel =
        interaction.channel;

    const guild =
        interaction.guild;

    await ticketLog(
        guild,
        "Ticket Closed",
        `Ticket: ${channel.name}\nClosed by: ${interaction.user}`
    );

    const embed =
        createEmbed({
            title:
                "Ticket Closing",
            description:
                "This ticket has been closed. The channel will be deleted shortly."
        });

    await interaction.reply({
        embeds: [embed]
    });

    setTimeout(
        () =>
            channel
                .delete()
                .catch(() => {}),
        5000
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
            `Author: ${message.author?.tag || "Unknown"}\nChannel: ${message.channel}\n\n${message.content?.slice(0, 1500) || "No text content."}`
        );
    }
);

/* =========================================================
   ERRORS
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

client.login(TOKEN);
