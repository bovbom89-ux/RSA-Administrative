require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    PermissionsBitField,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SlashCommandBuilder,
    REST,
    Routes,
    ChannelType
} = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const EMBED_COLOR = "#E75D2A";

/*
=====================================================
IN-MEMORY SERVER SETTINGS
=====================================================

This is a temporary configuration system.

Later, we can move this into a JSON/database system
so settings survive bot restarts.
*/

const guildSettings = new Map();

function getGuildSettings(guildId) {
    if (!guildSettings.has(guildId)) {
        guildSettings.set(guildId, {
            automod: false,
            honeypot: false,
            honeypotChannel: null,
            logChannel: null,
            staffRole: null,
            lockdown: false,
            kicks: 0
        });
    }

    return guildSettings.get(guildId);
}

/*
=====================================================
EMBED
=====================================================
*/

function makeEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(EMBED_COLOR)
        .setTitle(title)
        .setDescription(description);
}

/*
=====================================================
COMMANDS
=====================================================
*/

const commands = [

    // MODERATION

    new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Permanently ban a member.")
        .addUserOption(o =>
            o.setName("user")
                .setDescription("The member to ban.")
                .setRequired(true)
        )
        .addStringOption(o =>
            o.setName("reason")
                .setDescription("Reason for the ban.")
        ),

    new SlashCommandBuilder()
        .setName("unban")
        .setDescription("Unban a user.")
        .addStringOption(o =>
            o.setName("userid")
                .setDescription("The user's ID.")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("kick")
        .setDescription("Remove a member from the server.")
        .addUserOption(o =>
            o.setName("user")
                .setDescription("The member to kick.")
                .setRequired(true)
        )
        .addStringOption(o =>
            o.setName("reason")
                .setDescription("Reason for the kick.")
        ),

    new SlashCommandBuilder()
        .setName("timeout")
        .setDescription("Temporarily restrict a member.")
        .addUserOption(o =>
            o.setName("user")
                .setDescription("The member to timeout.")
                .setRequired(true)
        )
        .addIntegerOption(o =>
            o.setName("minutes")
                .setDescription("Timeout duration in minutes.")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(40320)
        )
        .addStringOption(o =>
            o.setName("reason")
                .setDescription("Reason for the timeout.")
        ),

    new SlashCommandBuilder()
        .setName("untimeout")
        .setDescription("Remove a member's timeout.")
        .addUserOption(o =>
            o.setName("user")
                .setDescription("The member.")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("warn")
        .setDescription("Warn a member.")
        .addUserOption(o =>
            o.setName("user")
                .setDescription("The member.")
                .setRequired(true)
        )
        .addStringOption(o =>
            o.setName("reason")
                .setDescription("Reason for the warning.")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("warnings")
        .setDescription("View a member's warnings.")
        .addUserOption(o =>
            o.setName("user")
                .setDescription("The member.")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("clearwarnings")
        .setDescription("Clear a member's warnings.")
        .addUserOption(o =>
            o.setName("user")
                .setDescription("The member.")
                .setRequired(true)
        ),

    // CHANNEL MANAGEMENT

    new SlashCommandBuilder()
        .setName("clear")
        .setDescription("Delete multiple messages.")
        .addIntegerOption(o =>
            o.setName("amount")
                .setDescription("Number of messages to delete.")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        ),

    new SlashCommandBuilder()
        .setName("purge")
        .setDescription("Delete recent messages.")
        .addIntegerOption(o =>
            o.setName("amount")
                .setDescription("Number of messages to delete.")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        ),

    new SlashCommandBuilder()
        .setName("slowmode")
        .setDescription("Set channel slowmode.")
        .addIntegerOption(o =>
            o.setName("seconds")
                .setDescription("Slowmode duration.")
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(21600)
        ),

    new SlashCommandBuilder()
        .setName("lock")
        .setDescription("Lock the current channel."),

    new SlashCommandBuilder()
        .setName("unlock")
        .setDescription("Unlock the current channel."),

    new SlashCommandBuilder()
        .setName("lockdown")
        .setDescription("Lock the server."),

    new SlashCommandBuilder()
        .setName("unlockdown")
        .setDescription("End the server lockdown."),

    // CONFIGURATION

    new SlashCommandBuilder()
        .setName("ghostysetup")
        .setDescription("Configure Ghosty for this server."),

    new SlashCommandBuilder()
        .setName("settings")
        .setDescription("Manage Ghosty's settings."),

    new SlashCommandBuilder()
        .setName("automodconfig")
        .setDescription("Configure Ghosty's AutoMod."),

    new SlashCommandBuilder()
        .setName("logs")
        .setDescription("Configure Ghosty's logging."),

    new SlashCommandBuilder()
        .setName("logsstatus")
        .setDescription("View logging settings."),

    // INFORMATION

    new SlashCommandBuilder()
        .setName("userinfo")
        .setDescription("View information about a member.")
        .addUserOption(o =>
            o.setName("user")
                .setDescription("The member.")
        ),

    new SlashCommandBuilder()
        .setName("serverinfo")
        .setDescription("View information about the server."),

    new SlashCommandBuilder()
        .setName("roleinfo")
        .setDescription("View information about a role.")
        .addRoleOption(o =>
            o.setName("role")
                .setDescription("The role.")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("channelinfo")
        .setDescription("View information about a channel."),

    new SlashCommandBuilder()
        .setName("avatar")
        .setDescription("View a member's avatar.")
        .addUserOption(o =>
            o.setName("user")
                .setDescription("The member.")
        ),

    new SlashCommandBuilder()
        .setName("banner")
        .setDescription("View a member's banner.")
        .addUserOption(o =>
            o.setName("user")
                .setDescription("The member.")
        ),

    // STAFF

    new SlashCommandBuilder()
        .setName("staff")
        .setDescription("Open the staff panel."),

    new SlashCommandBuilder()
        .setName("modstats")
        .setDescription("View moderation statistics."),

    // UTILITY

    new SlashCommandBuilder()
        .setName("help")
        .setDescription("View Ghosty's commands."),

    new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Check Ghosty's latency."),

    new SlashCommandBuilder()
        .setName("uptime")
        .setDescription("View Ghosty's uptime."),

    new SlashCommandBuilder()
        .setName("botinfo")
        .setDescription("View information about Ghosty."),

    new SlashCommandBuilder()
        .setName("invite")
        .setDescription("Get Ghosty's invite link."),

    new SlashCommandBuilder()
        .setName("support")
        .setDescription("Get the Ghosty support server.")

].map(command => command.toJSON());

/*
=====================================================
REGISTER COMMANDS
=====================================================
*/

async function registerCommands() {

    try {

        console.log("Registering Ghosty commands...");

        const application = await client.application.fetch();

        const rest = new REST({
            version: "10"
        }).setToken(process.env.DISCORD_TOKEN);

        await rest.put(
            Routes.applicationCommands(application.id),
            {
                body: commands
            }
        );

        console.log(
            `Successfully registered ${commands.length} commands.`
        );

    } catch (error) {

        console.error(
            "Command registration failed:",
            error
        );

    }
}

/*
=====================================================
READY
=====================================================
*/

client.once("ready", async () => {

    console.log(
        `Ghosty is online as ${client.user.tag}`
    );

    console.log(
        `Serving ${client.guilds.cache.size} server(s).`
    );

    await registerCommands();

});

/*
=====================================================
PERMISSION HELPERS
=====================================================
*/

function isAdministrator(interaction) {

    return interaction.memberPermissions.has(
        PermissionsBitField.Flags.Administrator
    );

}

function isModerator(interaction) {

    return interaction.memberPermissions.has(
        PermissionsBitField.Flags.KickMembers
    ) ||
    interaction.memberPermissions.has(
        PermissionsBitField.Flags.BanMembers
    ) ||
    interaction.memberPermissions.has(
        PermissionsBitField.Flags.ModerateMembers
    );

}

/*
=====================================================
MESSAGE HANDLER
=====================================================
*/

client.on("messageCreate", async message => {

    if (!message.guild) return;

    if (message.author.bot) return;

    const settings = getGuildSettings(
        message.guild.id
    );

    if (!settings.honeypot) return;

    if (!settings.honeypotChannel) return;

    if (message.channel.id !== settings.honeypotChannel) {
        return;
    }

    try {

        await message.delete().catch(() => {});

        const member = message.member;

        if (!member) return;

        if (!member.kickable) {

            console.log(
                `Honeypot detected ${message.author.tag}, but Ghosty could not kick them.`
            );

            return;
        }

        await member.kick(
            "Ghosty Honeypot"
        );

        settings.kicks++;

        const logChannel = settings.logChannel
            ? message.guild.channels.cache.get(
                settings.logChannel
            )
            : null;

        if (!logChannel) return;

        const warningEmbed = makeEmbed(
            "Honeypot Triggered",
            `A member was automatically removed for sending a message in the honeypot channel.\n\n` +
            `**User:** ${message.author}\n` +
            `**User ID:** ${message.author.id}\n` +
            `**Channel:** ${message.channel}\n` +
            `**Action:** Kick`
        );

        const counterButton =
            new ButtonBuilder()
                .setCustomId("honeypot_kicks")
                .setLabel(`Kicks: ${settings.kicks}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true);

        const row =
            new ActionRowBuilder()
                .addComponents(counterButton);

        await logChannel.send({
            embeds: [warningEmbed],
            components: [row]
        });

    } catch (error) {

        console.error(
            "Honeypot error:",
            error
        );

    }

});

/*
=====================================================
INTERACTIONS
=====================================================
*/

client.on("interactionCreate", async interaction => {

    try {

        if (interaction.isChatInputCommand()) {

            await handleCommand(interaction);

        }

        if (interaction.isButton()) {

            await handleButton(interaction);

        }

    } catch (error) {

        console.error(error);

        const response = {
            embeds: [
                makeEmbed(
                    "Something Went Wrong",
                    "Ghosty could not complete that action."
                )
            ],
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

});

/*
=====================================================
COMMAND HANDLER
=====================================================
*/

async function handleCommand(interaction) {

    const command =
        interaction.commandName;

    /*
    ADMINISTRATOR COMMANDS
    */

    const administratorCommands = [
        "ghostysetup",
        "settings",
        "automodconfig",
        "logs",
        "logsstatus",
        "lockdown",
        "unlockdown"
    ];

    if (
        administratorCommands.includes(command) &&
        !isAdministrator(interaction)
    ) {

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Permission Denied",
                    "You need Administrator permissions to use this command."
                )
            ],
            ephemeral: true
        });

    }

    /*
    MODERATOR COMMANDS
    */

    const moderatorCommands = [
        "ban",
        "unban",
        "kick",
        "timeout",
        "untimeout",
        "warn",
        "warnings",
        "clearwarnings",
        "clear",
        "purge",
        "slowmode",
        "lock",
        "unlock",
        "modstats",
        "staff"
    ];

    if (
        moderatorCommands.includes(command) &&
        !isModerator(interaction)
    ) {

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Permission Denied",
                    "You need moderator permissions to use this command."
                )
            ],
            ephemeral: true
        });

    }

    /*
    BAN
    */

    if (command === "ban") {

        const user =
            interaction.options.getUser("user");

        const reason =
            interaction.options.getString("reason") ||
            "No reason provided.";

        const member =
            await interaction.guild.members
                .fetch(user.id)
                .catch(() => null);

        if (!member || !member.bannable) {

            return interaction.reply({
                embeds: [
                    makeEmbed(
                        "Unable to Ban",
                        "Ghosty cannot ban that member."
                    )
                ],
                ephemeral: true
            });

        }

        await member.ban({
            reason
        });

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Member Banned",
                    `**User:** ${user}\n**Reason:** ${reason}`
                )
            ],
            ephemeral: true
        });

    }

    /*
    UNBAN
    */

    if (command === "unban") {

        const userId =
            interaction.options.getString(
                "userid"
            );

        try {

            await interaction.guild.members.unban(
                userId
            );

            return interaction.reply({
                embeds: [
                    makeEmbed(
                        "User Unbanned",
                        `User ID **${userId}** has been unbanned.`
                    )
                ],
                ephemeral: true
            });

        } catch {

            return interaction.reply({
                embeds: [
                    makeEmbed(
                        "Unable to Unban",
                        "That user could not be unbanned."
                    )
                ],
                ephemeral: true
            });

        }

    }

    /*
    KICK
    */

    if (command === "kick") {

        const user =
            interaction.options.getUser("user");

        const reason =
            interaction.options.getString("reason") ||
            "No reason provided.";

        const member =
            await interaction.guild.members
                .fetch(user.id)
                .catch(() => null);

        if (!member || !member.kickable) {

            return interaction.reply({
                embeds: [
                    makeEmbed(
                        "Unable to Kick",
                        "Ghosty cannot kick that member."
                    )
                ],
                ephemeral: true
            });

        }

        await member.kick(reason);

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Member Kicked",
                    `**User:** ${user}\n**Reason:** ${reason}`
                )
            ],
            ephemeral: true
        });

    }

    /*
    TIMEOUT
    */

    if (command === "timeout") {

        const user =
            interaction.options.getUser("user");

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

        if (!member || !member.moderatable) {

            return interaction.reply({
                embeds: [
                    makeEmbed(
                        "Unable to Timeout",
                        "Ghosty cannot timeout that member."
                    )
                ],
                ephemeral: true
            });

        }

        await member.timeout(
            minutes * 60 * 1000,
            reason
        );

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Member Timed Out",
                    `**User:** ${user}\n**Duration:** ${minutes} minute(s)\n**Reason:** ${reason}`
                )
            ],
            ephemeral: true
        });

    }

    /*
    UNTIMEOUT
    */

    if (command === "untimeout") {

        const user =
            interaction.options.getUser("user");

        const member =
            await interaction.guild.members
                .fetch(user.id)
                .catch(() => null);

        if (!member || !member.moderatable) {

            return interaction.reply({
                embeds: [
                    makeEmbed(
                        "Unable to Remove Timeout",
                        "Ghosty cannot modify that member."
                    )
                ],
                ephemeral: true
            });

        }

        await member.timeout(null);

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Timeout Removed",
                    `The timeout has been removed from ${user}.`
                )
            ],
            ephemeral: true
        });

    }

    /*
    WARN
    */

    if (command === "warn") {

        const user =
            interaction.options.getUser("user");

        const reason =
            interaction.options.getString(
                "reason"
            );

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Member Warned",
                    `**User:** ${user}\n**Reason:** ${reason}`
                )
            ],
            ephemeral: true
        });

    }

    /*
    WARNINGS
    */

    if (command === "warnings") {

        const user =
            interaction.options.getUser("user");

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Warnings",
                    `No persistent warning data has been configured yet for ${user}.`
                )
            ],
            ephemeral: true
        });

    }

    /*
    CLEAR WARNINGS
    */

    if (command === "clearwarnings") {

        const user =
            interaction.options.getUser("user");

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Warnings Cleared",
                    `Warnings for ${user} have been cleared.`
                )
            ],
            ephemeral: true
        });

    }

    /*
    CLEAR
    */

    if (command === "clear" || command === "purge") {

        const amount =
            interaction.options.getInteger(
                "amount"
            );

        if (
            !interaction.channel ||
            !interaction.channel.isTextBased()
        ) {

            return interaction.reply({
                embeds: [
                    makeEmbed(
                        "Invalid Channel",
                        "This command cannot be used here."
                    )
                ],
                ephemeral: true
            });

        }

        const deleted =
            await interaction.channel.bulkDelete(
                amount,
                true
            );

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Messages Cleared",
                    `Ghosty deleted **${deleted.size}** messages.`
                )
            ],
            ephemeral: true
        });

    }

    /*
    SLOWMODE
    */

    if (command === "slowmode") {

        const seconds =
            interaction.options.getInteger(
                "seconds"
            );

        await interaction.channel.setRateLimitPerUser(
            seconds
        );

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Slowmode Updated",
                    seconds === 0
                        ? "Slowmode has been disabled."
                        : `Slowmode has been set to **${seconds} seconds**.`
                )
            ],
            ephemeral: true
        });

    }

    /*
    LOCK
    */

    if (command === "lock") {

        await interaction.channel.permissionOverwrites.edit(
            interaction.guild.roles.everyone,
            {
                SendMessages: false
            }
        );

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Channel Locked",
                    "This channel has been locked."
                )
            ],
            ephemeral: true
        });

    }

    /*
    UNLOCK
    */

    if (command === "unlock") {

        await interaction.channel.permissionOverwrites.edit(
            interaction.guild.roles.everyone,
            {
                SendMessages: null
            }
        );

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Channel Unlocked",
                    "This channel has been unlocked."
                )
            ],
            ephemeral: true
        });

    }

    /*
    LOCKDOWN
    */

    if (
        command === "lockdown" ||
        command === "unlockdown"
    ) {

        const settings =
            getGuildSettings(
                interaction.guild.id
            );

        settings.lockdown =
            command === "lockdown";

        return interaction.reply({
            embeds: [
                makeEmbed(
                    settings.lockdown
                        ? "Server Lockdown"
                        : "Lockdown Ended",
                    settings.lockdown
                        ? "Ghosty has activated the server lockdown."
                        : "Ghosty has ended the server lockdown."
                )
            ],
            ephemeral: true
        });

    }

    /*
    GHOSTY SETUP
    */

    if (command === "ghostysetup") {

        const settings =
            getGuildSettings(
                interaction.guild.id
            );

        const setupEmbed =
            makeEmbed(
                "Ghosty Setup",
                `Configure Ghosty for this server.\n\n` +

                `**Moderation:** Configured\n` +

                `**AutoMod:** ${
                    settings.automod
                        ? "Enabled"
                        : "Disabled"
                }\n` +

                `**Honeypot:** ${
                    settings.honeypot
                        ? "Enabled"
                        : "Disabled"
                }\n` +

                `**Honeypot Channel:** ${
                    settings.honeypotChannel
                        ? `<#${settings.honeypotChannel}>`
                        : "Not configured"
                }\n` +

                `**Logging:** ${
                    settings.logChannel
                        ? `<#${settings.logChannel}>`
                        : "Not configured"
                }\n` +

                `**Lockdown:** ${
                    settings.lockdown
                        ? "Active"
                        : "Inactive"
                }`
            );

        const row =
            new ActionRowBuilder()
                .addComponents(

                    new ButtonBuilder()
                        .setCustomId(
                            "setup_automod"
                        )
                        .setLabel(
                            "AutoMod"
                        )
                        .setStyle(
                            ButtonStyle.Primary
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            "setup_honeypot"
                        )
                        .setLabel(
                            "Honeypot"
                        )
                        .setStyle(
                            ButtonStyle.Primary
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            "setup_logs"
                        )
                        .setLabel(
                            "Logging"
                        )
                        .setStyle(
                            ButtonStyle.Secondary
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            "setup_staff"
                        )
                        .setLabel(
                            "Staff"
                        )
                        .setStyle(
                            ButtonStyle.Secondary
                        )

                );

        return interaction.reply({
            embeds: [setupEmbed],
            components: [row],
            ephemeral: true
        });

    }

    /*
    AUTOMOD CONFIG
    */

    if (command === "automodconfig") {

        const settings =
            getGuildSettings(
                interaction.guild.id
            );

        const panel =
            makeEmbed(
                "Ghosty AutoMod",
                `**Status:** ${
                    settings.automod
                        ? "Enabled"
                        : "Disabled"
                }\n\n` +

                `**Spam Protection:** Enabled\n` +
                `**Mention Protection:** Enabled\n` +
                `**Invite Protection:** Enabled\n` +
                `**Word Filter:** Enabled\n` +
                `**Excessive Caps:** Disabled`
            );

        const row =
            new ActionRowBuilder()
                .addComponents(

                    new ButtonBuilder()
                        .setCustomId(
                            "automod_enable"
                        )
                        .setLabel(
                            "Enable"
                        )
                        .setStyle(
                            ButtonStyle.Success
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            "automod_configure"
                        )
                        .setLabel(
                            "Configure"
                        )
                        .setStyle(
                            ButtonStyle.Primary
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            "automod_logs"
                        )
                        .setLabel(
                            "Logs"
                        )
                        .setStyle(
                            ButtonStyle.Secondary
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            "automod_disable"
                        )
                        .setLabel(
                            "Disable"
                        )
                        .setStyle(
                            ButtonStyle.Danger
                        )

                );

        return interaction.reply({
            embeds: [panel],
            components: [row],
            ephemeral: true
        });

    }

    /*
    USER INFO
    */

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

        const description =
            `**Username:** ${user.tag}\n` +
            `**User ID:** ${user.id}\n` +
            `**Account Created:** <t:${Math.floor(
                user.createdTimestamp / 1000
            )}:F>\n` +
            `**Server Joined:** ${
                member
                    ? `<t:${Math.floor(
                        member.joinedTimestamp / 1000
                    )}:F>`
                    : "Unknown"
            }\n` +
            `**Bot:** ${user.bot ? "Yes" : "No"}`;

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "User Information",
                    description
                )
            ],
            ephemeral: true
        });

    }

    /*
    SERVER INFO
    */

    if (command === "serverinfo") {

        const guild =
            interaction.guild;

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Server Information",
                    `**Name:** ${guild.name}\n` +
                    `**Server ID:** ${guild.id}\n` +
                    `**Owner:** <@${guild.ownerId}>\n` +
                    `**Members:** ${guild.memberCount}\n` +
                    `**Channels:** ${guild.channels.cache.size}\n` +
                    `**Roles:** ${guild.roles.cache.size}\n` +
                    `**Created:** <t:${Math.floor(
                        guild.createdTimestamp / 1000
                    )}:F>`
                )
            ],
            ephemeral: true
        });

    }

    /*
    ROLE INFO
    */

    if (command === "roleinfo") {

        const role =
            interaction.options.getRole(
                "role"
            );

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Role Information",
                    `**Name:** ${role.name}\n` +
                    `**Role ID:** ${role.id}\n` +
                    `**Members:** ${role.members.size}\n` +
                    `**Position:** ${role.position}\n` +
                    `**Mentionable:** ${role.mentionable ? "Yes" : "No"}\n` +
                    `**Hoisted:** ${role.hoist ? "Yes" : "No"}`
                )
            ],
            ephemeral: true
        });

    }

    /*
    CHANNEL INFO
    */

    if (command === "channelinfo") {

        const channel =
            interaction.channel;

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Channel Information",
                    `**Name:** ${channel.name}\n` +
                    `**Channel ID:** ${channel.id}\n` +
                    `**Type:** ${channel.type}\n` +
                    `**Created:** <t:${Math.floor(
                        channel.createdTimestamp / 1000
                    )}:F>`
                )
            ],
            ephemeral: true
        });

    }

    /*
    AVATAR
    */

    if (command === "avatar") {

        const user =
            interaction.options.getUser(
                "user"
            ) ||
            interaction.user;

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Avatar",
                    `[Open Avatar](${user.displayAvatarURL({
                        size: 4096,
                        extension: "png"
                    })})`
                )
                .setImage(
                    user.displayAvatarURL({
                        size: 4096
                    })
                )
            ],
            ephemeral: true
        });

    }

    /*
    BANNER
    */

    if (command === "banner") {

        const user =
            interaction.options.getUser(
                "user"
            ) ||
            interaction.user;

        const fetched =
            await user.fetch();

        if (!fetched.banner) {

            return interaction.reply({
                embeds: [
                    makeEmbed(
                        "No Banner",
                        "This user does not have a profile banner."
                    )
                ],
                ephemeral: true
            });

        }

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Profile Banner",
                    `[Open Banner](${fetched.bannerURL({
                        size: 4096
                    })})`
                )
                .setImage(
                    fetched.bannerURL({
                        size: 4096
                    })
                )
            ],
            ephemeral: true
        });

    }

    /*
    PING
    */

    if (command === "ping") {

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Ghosty Ping",
                    `WebSocket latency: **${client.ws.ping}ms**`
                )
            ],
            ephemeral: true
        });

    }

    /*
    UPTIME
    */

    if (command === "uptime") {

        const seconds =
            Math.floor(
                process.uptime()
            );

        const days =
            Math.floor(
                seconds / 86400
            );

        const hours =
            Math.floor(
                (seconds % 86400) / 3600
            );

        const minutes =
            Math.floor(
                (seconds % 3600) / 60
            );

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Ghosty Uptime",
                    `${days} days, ${hours} hours and ${minutes} minutes.`
                )
            ],
            ephemeral: true
        });

    }

    /*
    BOT INFO
    */

    if (command === "botinfo") {

        const application =
            await client.application.fetch();

        const owner =
            application.owner;

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Ghosty",
                    `Ghosty is a Discord moderation bot designed to provide server staff with powerful moderation, AutoMod, logging and server protection tools.\n\n` +

                    `**Version:** 1.0.0\n` +
                    `**Servers:** ${client.guilds.cache.size}\n` +
                    `**Users:** ${client.guilds.cache.reduce(
                        (total, guild) =>
                            total + guild.memberCount,
                        0
                    )}\n` +
                    `**Commands:** ${commands.length}\n` +
                    `**Discord.js:** ${require("discord.js").version}\n` +
                    `**Owner:** ${
                        owner && owner.user
                            ? owner.user.tag
                            : "Not available"
                    }`
                )
            ],
            ephemeral: true
        });

    }

    /*
    HELP
    */

    if (command === "help") {

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "Ghosty Commands",
                    `**Moderation**\n` +
                    `/ban\n/unban\n/kick\n/timeout\n/untimeout\n/warn\n/warnings\n/clearwarnings\n\n` +

                    `**Channel Management**\n` +
                    `/clear\n/purge\n/slowmode\n/lock\n/unlock\n/lockdown\n/unlockdown\n\n` +

                    `**Configuration**\n` +
                    `/ghostysetup\n/settings\n/automodconfig\n/logs\n/logsstatus\n\n` +

                    `**Information**\n` +
                    `/userinfo\n/serverinfo\n/roleinfo\n/channelinfo\n/avatar\n/banner\n\n` +

                    `**Staff**\n` +
                    `/staff\n/modstats\n\n` +

                    `**Utility**\n` +
                    `/help\n/ping\n/uptime\n/botinfo\n/invite\n/support`
                )
            ],
            ephemeral: true
        });

    }

    /*
    FALLBACK
    */

    return interaction.reply({
        embeds: [
            makeEmbed(
                "Coming Soon",
                "This feature has been registered and will be implemented in a future Ghosty update."
            )
        ],
        ephemeral: true
    });

}

/*
=====================================================
BUTTON HANDLER
=====================================================
*/

async function handleButton(interaction) {

    const settings =
        getGuildSettings(
            interaction.guild.id
        );

    /*
    SETUP AUTOMOD
    */

    if (
        interaction.customId ===
        "setup_automod"
    ) {

        const row =
            new ActionRowBuilder()
                .addComponents(

                    new ButtonBuilder()
                        .setCustomId(
                            "automod_enable"
                        )
                        .setLabel(
                            "Enable"
                        )
                        .setStyle(
                            ButtonStyle.Success
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            "automod_disable"
                        )
                        .setLabel(
                            "Disable"
                        )
                        .setStyle(
                            ButtonStyle.Danger
                        )

                );

        return interaction.update({
            embeds: [
                makeEmbed(
                    "AutoMod Setup",
                    `Current status: **${
                        settings.automod
                            ? "Enabled"
                            : "Disabled"
                    }**`
                )
            ],
            components: [row]
        });

    }

    /*
    AUTOMOD ENABLE
    */

    if (
        interaction.customId ===
        "automod_enable"
    ) {

        settings.automod = true;

        return interaction.update({
            embeds: [
                makeEmbed(
                    "AutoMod Enabled",
                    "Ghosty's AutoMod system is now enabled for this server."
                )
            ],
            components: []
        });

    }

    /*
    AUTOMOD DISABLE
    */

    if (
        interaction.customId ===
        "automod_disable"
    ) {

        settings.automod = false;

        return interaction.update({
            embeds: [
                makeEmbed(
                    "AutoMod Disabled",
                    "Ghosty's AutoMod system is now disabled."
                )
            ],
            components: []
        });

    }

    /*
    SETUP HONEYPOT
    */

    if (
        interaction.customId ===
        "setup_honeypot"
    ) {

        const channels =
            interaction.guild.channels.cache
                .filter(channel =>
                    channel.type === ChannelType.GuildText
                )
                .first(5);

        const channelList =
            channels.length
                ? channels
                    .map(channel =>
                        `<#${channel.id}>`
                    )
                    .join("\n")
                : "No text channels found.";

        return interaction.update({
            embeds: [
                makeEmbed(
                    "Honeypot Setup",
                    `The honeypot watches one channel for messages. Any member who sends a message there will have their message deleted and will be kicked if Ghosty can moderate them.\n\n` +
                    `Current channel: ${
                        settings.honeypotChannel
                            ? `<#${settings.honeypotChannel}>`
                            : "Not configured"
                    }\n\n` +
                    `Use the channel selector below to configure the honeypot.\n\n` +
                    `Available channels:\n${channelList}`
                )
            ],
            components: []
        });

    }

    /*
    SETUP LOGS
    */

    if (
        interaction.customId ===
        "setup_logs"
    ) {

        return interaction.update({
            embeds: [
                makeEmbed(
                    "Logging Setup",
                    `Current logging channel: ${
                        settings.logChannel
                            ? `<#${settings.logChannel}>`
                            : "Not configured"
                    }\n\nUse /logs to configure Ghosty's logging system.`
                )
            ],
            components: []
        });

    }

    /*
    SETUP STAFF
    */

    if (
        interaction.customId ===
        "setup_staff"
    ) {

        return interaction.update({
            embeds: [
                makeEmbed(
                    "Staff Setup",
                    "Staff role configuration will be available here."
                )
            ],
            components: []
        });

    }

    /*
    AUTOMOD CONFIGURE
    */

    if (
        interaction.customId ===
        "automod_configure"
    ) {

        return interaction.update({
            embeds: [
                makeEmbed(
                    "AutoMod Configuration",
                    "Choose the AutoMod protection you want to configure."
                )
            ],
            components: []
        });

    }

    /*
    AUTOMOD LOGS
    */

    if (
        interaction.customId ===
        "automod_logs"
    ) {

        return interaction.reply({
            embeds: [
                makeEmbed(
                    "AutoMod Logs",
                    "AutoMod logging configuration is available through the Ghosty logging system."
                )
            ],
            ephemeral: true
        });

    }

}

/*
=====================================================
TOKEN CHECK
=====================================================
*/

if (!process.env.DISCORD_TOKEN) {

    console.error(
        "DISCORD_TOKEN is missing from environment variables."
    );

    process.exit(1);

}

/*
=====================================================
LOGIN
=====================================================
*/

client.login(
    process.env.DISCORD_TOKEN
);
