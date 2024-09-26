// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.

/**
 * Enumeration of all possible exit codes returned by an application.
 */
export const ExitCode = {
    /**
     * Unable to find a command in the application with the given command line arguments.
     */
    UnknownCommand: -5,
    /**
     * Unable to parse the specified arguments.
     */
    InvalidArgument: -4,
    /**
     * An error was thrown while loading the context for a command run.
     */
    ContextLoadError: -3,
    /**
     * Failed to load command module.
     */
    CommandLoadError: -2,
    /**
     * An unexpected error was thrown by or not caught by this library.
     */
    InternalError: -1,
    /**
     * Command executed successfully.
     */
    Success: 0,
    /**
     * Command module unexpectedly threw an error.
     */
    CommandRunError: 1,
} as const;
