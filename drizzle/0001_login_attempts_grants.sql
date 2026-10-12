-- pharmcare_app may read and add failed logins, never change or delete them.
GRANT SELECT, INSERT ON login_attempts TO pharmcare_app;
