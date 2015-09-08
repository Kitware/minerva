-- Function: geonode_authorize_layer(character varying, character varying)

-- DROP FUNCTION geonode_authorize_layer(character varying, character varying);

CREATE OR REPLACE FUNCTION geonode_authorize_layer(
    user_name character varying,
    type_name character varying)
  RETURNS character varying AS
$BODY$

DECLARE
view_perm integer;
change_perm integer;
roles varchar[] = '{anonymous,NULL}';
ct integer;
user RECORD;
layer RECORD;
groups_enabled BOOLEAN;
BEGIN

-- see if groups are enabled
SELECT INTO groups_enabled EXISTS(SELECT *
            FROM information_schema.tables
            WHERE TABLE_NAME='auth_group');

-- get the layer and user, take quick action if we can
SELECT INTO layer "base_resourcebase"."id", "base_resourcebase"."owner_id"
FROM "base_resourcebase", "layers_layer"
WHERE "base_resourcebase"."id" = "layers_layer"."resourcebase_ptr_id" AND "layers_layer"."typename" = type_name;
if (not FOUND) then
	-- no layer
	return 'nl';
end if;

if (user_name IS NULL or user_name = '') then
	user_name = 'AnonymousUser';
end if;

if (user_name IS NOT NULL) then
	SELECT INTO user * FROM "people_profile" WHERE "people_profile"."username" = user_name;
	if (not FOUND) then
		-- no user
		return 'nu';
	end if;


	if ("user".id = "layer".owner_id) then
		-- layer owner
		return 'lo-rw';
	end if;
	if ("user".is_superuser) then
		-- super user
		return 'su-rw';
	end if;
	roles[2] = 'authenticated';
end if;

-- resolve permission and content_type ids
SELECT INTO view_perm "auth_permission"."id"
        FROM "auth_permission" INNER JOIN "django_content_type"
        ON ("auth_permission"."content_type_id" = "django_content_type"."id")
        WHERE ("auth_permission"."codename" = E'view_resourcebase'
        AND "django_content_type"."app_label" = E'base' );
SELECT INTO change_perm "auth_permission"."id"
	FROM "auth_permission" INNER JOIN "django_content_type"
	ON ("auth_permission"."content_type_id" = "django_content_type"."id")
	WHERE ("auth_permission"."codename" = E'change_resourcebase'
	AND "django_content_type"."app_label" = E'base' );
SELECT INTO ct "django_content_type"."id"
	FROM "django_content_type"
	WHERE ("django_content_type"."model" = E'resourcebase'
	AND "django_content_type"."app_label" = E'base' );

if (user_name IS NOT NULL) then
	-- user role, read-write
	PERFORM "guardian_userobjectpermission"."object_pk"
		FROM "guardian_userobjectpermission"
		WHERE ("guardian_userobjectpermission"."permission_id" = change_perm
		AND "guardian_userobjectpermission"."content_type_id" = ct
		AND ("guardian_userobjectpermission"."user_id" = "user".id
		  OR "guardian_userobjectpermission"."user_id" = -1)
		AND CAST("guardian_userobjectpermission"."object_pk" as integer) = "layer".id
		);
	if (FOUND) then return 'ur-rw'; end if;

  -- user role, user has read-write permissions via group membership
  if (groups_enabled) then
    PERFORM "guardian_groupobjectpermission"."object_pk"
      FROM "guardian_groupobjectpermission"
      WHERE ("guardian_groupobjectpermission"."permission_id" = change_perm
      AND "guardian_groupobjectpermission"."content_type_id" = ct
      AND "guardian_groupobjectpermission"."group_id" IN (SELECT DISTINCT(group_id) FROM groups_groupmember WHERE user_id="user".id)
      AND CAST("guardian_groupobjectpermission"."object_pk" as integer) = "layer".id
      );
    if (FOUND) then return 'group-rw'; end if;
	end if;

	-- user role, read-only
  PERFORM "guardian_userobjectpermission"."object_pk"
		FROM "guardian_userobjectpermission"
		WHERE ("guardian_userobjectpermission"."permission_id" = view_perm
		AND "guardian_userobjectpermission"."content_type_id" = ct
		AND ("guardian_userobjectpermission"."user_id" = "user".id
		  OR "guardian_userobjectpermission"."user_id" = -1)
		AND CAST("guardian_userobjectpermission"."object_pk" as integer) = "layer".id
		);
	if (FOUND) then return 'ur-ro'; end if;

	-- user role, user has read-only permissions via group membership
	if (groups_enabled) then
    PERFORM "guardian_groupobjectpermission"."object_pk"
      FROM "guardian_groupobjectpermission"
      WHERE ("guardian_groupobjectpermission"."permission_id" = view_perm
      AND "guardian_groupobjectpermission"."content_type_id" = ct
      AND "guardian_groupobjectpermission"."group_id" IN (SELECT DISTINCT(group_id) FROM groups_groupmember WHERE user_id="user".id)
      AND CAST("guardian_groupobjectpermission"."object_pk" as integer) = "layer".id
      );
	if (FOUND) then return 'group-ro'; end if;
	end if;
end if;

-- uh oh, nothing found
return 'nf';

END
$BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
ALTER FUNCTION geonode_authorize_layer(character varying, character varying)
  OWNER TO geonode;
