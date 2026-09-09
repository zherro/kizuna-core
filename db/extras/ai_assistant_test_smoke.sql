BEGIN;
SELECT 'perm OK'          FROM auth.permissions    WHERE resource = 'ai_assistant' AND action = 'manage';
SELECT 'registry OK'      FROM auth.plugin_registry WHERE name = 'ai_assistant';
SELECT 'provider seed OK' FROM auth.system_config  WHERE key = 'ai_assistant.provider' AND value #>> '{}' = 'gemini';
SELECT 'model seed OK'    FROM auth.system_config  WHERE key = 'ai_assistant.model';
SELECT 'contexts seed OK' FROM auth.system_config  WHERE key = 'ai_assistant.contexts';
ROLLBACK;
