-- Lets the owner switch to the application role (for verification and the app connection),
-- without inheriting its privileges by default. PG16 gives the creator ADMIN but not SET.
GRANT siro_app TO siro_owner WITH INHERIT FALSE, SET TRUE;
