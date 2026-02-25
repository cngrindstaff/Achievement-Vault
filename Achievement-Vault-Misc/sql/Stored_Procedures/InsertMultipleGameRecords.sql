-- Stored procedure to insert multiple game records at once.
-- Accepts a JSON array of record objects. All records share the same
-- description, sectionId, gameId, numberOfCheckboxes, numberAlreadyCompleted,
-- listOrder, longDescription, and hidden values — only the name differs.
--
-- Example JSON input:
-- [
--   {"name": "Record One", "description": "", "sectionId": 1, "gameId": 1,
--    "numberOfCheckboxes": 1, "numberAlreadyCompleted": 0, "listOrder": 100,
--    "longDescription": "", "hidden": 0},
--   {"name": "Record Two", ...}
-- ]

DELIMITER $$

CREATE PROCEDURE `InsertMultipleGameRecords`(
    IN recordsJson JSON
)
BEGIN
    INSERT INTO GameRecords
        (Name, Description, SectionId, GameID, NumberOfCheckboxes, NumberAlreadyCompleted, ListOrder, LongDescription, Hidden, DateCreated)
    SELECT
        j.recordName,
        j.description,
        j.sectionId,
        j.gameId,
        j.numberOfCheckboxes,
        j.numberAlreadyCompleted,
        j.listOrder,
        j.longDescription,
        j.hidden,
        UTC_TIMESTAMP()
    FROM JSON_TABLE(recordsJson, '$[*]' COLUMNS (
        recordName VARCHAR(100) PATH '$.name',
        description VARCHAR(1000) PATH '$.description',
        sectionId INT PATH '$.sectionId',
        gameId INT PATH '$.gameId',
        numberOfCheckboxes INT PATH '$.numberOfCheckboxes',
        numberAlreadyCompleted INT PATH '$.numberAlreadyCompleted',
        listOrder INT PATH '$.listOrder',
        longDescription VARCHAR(1000) PATH '$.longDescription',
        hidden TINYINT PATH '$.hidden'
    )) AS j;
END$$

DELIMITER ;
