/* ABL Helper — batch compile check (invoked by VS Code extension via _progres -b -p).
   Environment: ABL_CHECK_FILE (source), ABL_LISTING (optional message log). */
DEFINE VARIABLE cFile    AS CHARACTER NO-UNDO.
DEFINE VARIABLE cListing AS CHARACTER NO-UNDO.
DEFINE VARIABLE i        AS INTEGER   NO-UNDO.

ASSIGN
  cFile    = OS-GETENV("ABL_CHECK_FILE")
  cListing = OS-GETENV("ABL_LISTING").

IF cFile = ? OR cFile = "" THEN
  RETURN ERROR "ABL_CHECK_FILE is not set.".

COMPILE VALUE(cFile) SAVE = NO NO-ERROR.

IF cListing <> ? AND cListing <> "" THEN DO:
  OUTPUT TO VALUE(cListing).
  DO i = 1 TO COMPILER:NUM-MESSAGES:
    PUT UNFORMATTED COMPILER:GET-MESSAGE(i) SKIP.
  END.
  OUTPUT CLOSE.
END.
