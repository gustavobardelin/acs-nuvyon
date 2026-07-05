--
-- PostgreSQL database dump
--

\restrict 0uh9HJQiyddRbaN7J2ZhCgMdLgdaeckmLgouRuxXsBP8ZnSjmjKFhhDiC3iaWUf

-- Dumped from database version 15.18
-- Dumped by pg_dump version 15.18

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: device_actions_actiontype_enum; Type: TYPE; Schema: public; Owner: acs_admin
--

CREATE TYPE public.device_actions_actiontype_enum AS ENUM (
    'REBOOT',
    'REFRESH_OBJECT',
    'UPDATE_WIFI',
    'TEST_CONNECTION_REQUEST',
    'SET_PARAMETER_VALUES'
);


ALTER TYPE public.device_actions_actiontype_enum OWNER TO acs_admin;

--
-- Name: device_actions_method_enum; Type: TYPE; Schema: public; Owner: acs_admin
--

CREATE TYPE public.device_actions_method_enum AS ENUM (
    'CONNECTION_REQUEST',
    'NEXT_INFORM',
    'DIRECT_HTTP_TEST',
    'INTERNAL'
);


ALTER TYPE public.device_actions_method_enum OWNER TO acs_admin;

--
-- Name: device_actions_status_enum; Type: TYPE; Schema: public; Owner: acs_admin
--

CREATE TYPE public.device_actions_status_enum AS ENUM (
    'PENDING',
    'SUCCESS',
    'FAILED'
);


ALTER TYPE public.device_actions_status_enum OWNER TO acs_admin;

--
-- Name: users_role_enum; Type: TYPE; Schema: public; Owner: acs_admin
--

CREATE TYPE public.users_role_enum AS ENUM (
    'ADMIN',
    'NOC',
    'SUPPORT',
    'FIELD_TECH'
);


ALTER TYPE public.users_role_enum OWNER TO acs_admin;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: device_actions; Type: TABLE; Schema: public; Owner: acs_admin
--

CREATE TABLE public.device_actions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "deviceId" character varying(255) NOT NULL,
    "deviceLabel" character varying(255),
    "actionType" public.device_actions_actiontype_enum NOT NULL,
    "actionLabel" character varying(255) NOT NULL,
    status public.device_actions_status_enum DEFAULT 'PENDING'::public.device_actions_status_enum NOT NULL,
    method public.device_actions_method_enum DEFAULT 'CONNECTION_REQUEST'::public.device_actions_method_enum NOT NULL,
    "objectName" character varying(255),
    "requestedByUserId" character varying(255),
    "requestedByEmail" character varying(255),
    "requestPayload" jsonb,
    "responsePayload" jsonb,
    "responseStatusCode" integer,
    "errorMessage" text,
    "startedAt" timestamp with time zone NOT NULL,
    "finishedAt" timestamp with time zone,
    "durationMs" integer,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.device_actions OWNER TO acs_admin;

--
-- Name: device_alert_states; Type: TABLE; Schema: public; Owner: acs_admin
--

CREATE TABLE public.device_alert_states (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "alertKey" character varying(500) NOT NULL,
    "deviceId" character varying(255) NOT NULL,
    severity character varying(30) NOT NULL,
    category character varying(50) NOT NULL,
    title character varying(180) NOT NULL,
    description text NOT NULL,
    status character varying(30) DEFAULT 'OPEN'::character varying NOT NULL,
    "occurrenceCount" integer DEFAULT 1 NOT NULL,
    "firstSeenAt" timestamp with time zone NOT NULL,
    "lastSeenAt" timestamp with time zone NOT NULL,
    "acknowledgedByEmail" character varying(255),
    "acknowledgedAt" timestamp with time zone,
    "silencedByEmail" character varying(255),
    "silencedAt" timestamp with time zone,
    "silencedUntil" timestamp with time zone,
    note text,
    "resolvedByEmail" character varying(255),
    "resolvedAt" timestamp with time zone,
    "resolutionNote" text,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.device_alert_states OWNER TO acs_admin;

--
-- Name: device_groups; Type: TABLE; Schema: public; Owner: acs_admin
--

CREATE TABLE public.device_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(120) NOT NULL,
    description text,
    filters jsonb DEFAULT '{}'::jsonb NOT NULL,
    tags jsonb DEFAULT '[]'::jsonb NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    "createdByEmail" character varying(255),
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.device_groups OWNER TO acs_admin;

--
-- Name: device_metadata; Type: TABLE; Schema: public; Owner: acs_admin
--

CREATE TABLE public.device_metadata (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "deviceId" character varying(255) NOT NULL,
    label character varying(160),
    "customerName" character varying(160),
    "customerCode" character varying(80),
    city character varying(180),
    address character varying(255),
    "operationalMode" character varying(40) DEFAULT 'unknown'::character varying NOT NULL,
    tags jsonb DEFAULT '[]'::jsonb NOT NULL,
    notes text,
    "updatedByEmail" character varying(255),
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.device_metadata OWNER TO acs_admin;

--
-- Name: provisioning_jobs; Type: TABLE; Schema: public; Owner: acs_admin
--

CREATE TABLE public.provisioning_jobs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(180) NOT NULL,
    description text,
    "groupId" uuid NOT NULL,
    "groupName" character varying(180) NOT NULL,
    "templateId" uuid NOT NULL,
    "templateName" character varying(180) NOT NULL,
    status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    "targetCount" integer DEFAULT 0 NOT NULL,
    "successCount" integer DEFAULT 0 NOT NULL,
    "failedCount" integer DEFAULT 0 NOT NULL,
    "limit" integer DEFAULT 20 NOT NULL,
    "requestPayload" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "resultPayload" jsonb,
    "errorMessage" text,
    "createdByEmail" character varying(255),
    "startedAt" timestamp with time zone,
    "finishedAt" timestamp with time zone,
    "durationMs" integer,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.provisioning_jobs OWNER TO acs_admin;

--
-- Name: provisioning_templates; Type: TABLE; Schema: public; Owner: acs_admin
--

CREATE TABLE public.provisioning_templates (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(120) NOT NULL,
    description text,
    vendor character varying(120),
    model character varying(120),
    "productClass" character varying(120),
    parameters jsonb DEFAULT '[]'::jsonb NOT NULL,
    tags jsonb DEFAULT '[]'::jsonb NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    "createdByEmail" character varying(255),
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.provisioning_templates OWNER TO acs_admin;

--
-- Name: users; Type: TABLE; Schema: public; Owner: acs_admin
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying NOT NULL,
    "passwordHash" character varying NOT NULL,
    role public.users_role_enum DEFAULT 'SUPPORT'::public.users_role_enum NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO acs_admin;

--
-- Data for Name: device_actions; Type: TABLE DATA; Schema: public; Owner: acs_admin
--

COPY public.device_actions (id, "deviceId", "deviceLabel", "actionType", "actionLabel", status, method, "objectName", "requestedByUserId", "requestedByEmail", "requestPayload", "responsePayload", "responseStatusCode", "errorMessage", "startedAt", "finishedAt", "durationMs", "createdAt", "updatedAt") FROM stdin;
6b7158ec-0f33-42b5-a817-ab5de8a4efa1	6032B1-Archer%20C21-6032B16EA7C1	\N	REBOOT	Reboot	SUCCESS	CONNECTION_REQUEST	\N	\N	admin@nuvyon.com	{"deviceId": "6032B1-Archer%20C21-6032B16EA7C1", "useConnectionRequest": true}	{"task": {"_id": "6a4119cee9437dbd5ee08416", "name": "reboot", "device": "6032B1-Archer%20C21-6032B16EA7C1", "timestamp": "2026-06-28T12:55:42.851Z"}}	\N	\N	2026-06-28 12:55:42.811+00	2026-06-28 12:55:44.868+00	2057	2026-06-28 12:55:42.818576+00	2026-06-28 12:55:44.873732+00
c037e37a-9e77-4bad-ae61-d5293469d43b	6032B1-Archer%20C21-6032B16EA7C1	\N	REFRESH_OBJECT	Refresh geral	SUCCESS	CONNECTION_REQUEST	\N	\N	admin@nuvyon.com	{"deviceId": "6032B1-Archer%20C21-6032B16EA7C1", "objectName": "", "useConnectionRequest": true}	{"task": {"_id": "6a4119da9ad18c879466a21e", "name": "refreshObject", "device": "6032B1-Archer%20C21-6032B16EA7C1", "timestamp": "2026-06-28T12:55:54.907Z", "objectName": ""}}	\N	\N	2026-06-28 12:55:54.878+00	2026-06-28 12:55:57.073+00	2195	2026-06-28 12:55:54.880218+00	2026-06-28 12:55:57.07701+00
4632c877-2e03-4608-a7d0-27d638c6baa5	6032B1-Archer%20C21-6032B16EA7C1	\N	REFRESH_OBJECT	Refresh geral	SUCCESS	CONNECTION_REQUEST	\N	\N	admin@nuvyon.com	{"deviceId": "6032B1-Archer%20C21-6032B16EA7C1", "objectName": "", "useConnectionRequest": true}	{"task": {"_id": "6a4123f29ad18c879466a21f", "name": "refreshObject", "device": "6032B1-Archer%20C21-6032B16EA7C1", "timestamp": "2026-06-28T13:38:58.857Z", "objectName": ""}}	\N	\N	2026-06-28 13:38:58.803+00	2026-06-28 13:39:00.868+00	2065	2026-06-28 13:38:58.810375+00	2026-06-28 13:39:00.874104+00
00a61d1e-7e8a-4620-967c-563e62375601	6032B1-Archer%20C21-6032B16EA7C1	\N	UPDATE_WIFI	Alteração de Wi-Fi	SUCCESS	CONNECTION_REQUEST	\N	\N	admin@nuvyon.com	{"ssid": null, "enabled": true, "deviceId": "6032B1-Archer%20C21-6032B16EA7C1", "instance": "2", "standard": "TR-181", "passwordChanged": false}	{"task": {"_id": "6a4126f09ad18c879466a220", "name": "setParameterValues", "device": "6032B1-Archer%20C21-6032B16EA7C1", "timestamp": "2026-06-28T13:51:44.155Z", "parameterValues": [["Device.WiFi.AccessPoint.2.Enable", true, "xsd:boolean"], ["Device.WiFi.SSID.2.Enable", true, "xsd:boolean"]]}}	\N	\N	2026-06-28 13:51:44.102+00	2026-06-28 13:51:46.169+00	2067	2026-06-28 13:51:44.118886+00	2026-06-28 13:51:46.173243+00
c4ce1568-3ae9-4663-becf-858eb3cc1e0c	6032B1-Archer%20C21-6032B16EA7C1	\N	REFRESH_OBJECT	Refresh geral	SUCCESS	CONNECTION_REQUEST	\N	\N	admin@nuvyon.com	{"deviceId": "6032B1-Archer%20C21-6032B16EA7C1", "objectName": "", "useConnectionRequest": true}	{"task": {"_id": "6a4127169ad18c879466a221", "name": "refreshObject", "device": "6032B1-Archer%20C21-6032B16EA7C1", "timestamp": "2026-06-28T13:52:22.219Z", "objectName": ""}}	\N	\N	2026-06-28 13:52:22.172+00	2026-06-28 13:52:24.236+00	2064	2026-06-28 13:52:22.191786+00	2026-06-28 13:52:24.244273+00
f45269c8-b4e2-406c-83e0-818eb8020957	6032B1-Archer%20C21-6032B16EA7C1	\N	REBOOT	Reboot	SUCCESS	CONNECTION_REQUEST	\N	\N	admin@nuvyon.com	{"deviceId": "6032B1-Archer%20C21-6032B16EA7C1", "useConnectionRequest": true}	{"task": {"_id": "6a41272a9ad18c879466a222", "name": "reboot", "device": "6032B1-Archer%20C21-6032B16EA7C1", "timestamp": "2026-06-28T13:52:42.474Z"}}	\N	\N	2026-06-28 13:52:42.433+00	2026-06-28 13:52:44.491+00	2058	2026-06-28 13:52:42.448328+00	2026-06-28 13:52:44.493829+00
fde6e44d-befe-4283-9664-6e998777c835	6032B1-Archer%20C21-6032B16EA7C1	\N	SET_PARAMETER_VALUES	Aplicar template: Archer C21 - TR-069 Operacional	SUCCESS	CONNECTION_REQUEST	\N	\N	admin@nuvyon.com	{"templateId": "0fad2aec-4f68-48f7-a696-c12028dedf57", "templateName": "Archer C21 - TR-069 Operacional", "parameterCount": 2}	{"task": {"_id": "6a412b599ad18c879466a223", "name": "setParameterValues", "device": "6032B1-Archer%20C21-6032B16EA7C1", "timestamp": "2026-06-28T14:10:33.047Z", "parameterValues": [["Device.ManagementServer.PeriodicInformEnable", true, "xsd:boolean"], ["Device.ManagementServer.PeriodicInformInterval", 300, "xsd:unsignedInt"]]}}	\N	\N	2026-06-28 14:10:33.009+00	2026-06-28 14:10:35.059+00	2050	2026-06-28 14:10:33.010063+00	2026-06-28 14:10:35.065291+00
0f257235-3449-432b-9f49-fb861245540a	6032B1-Archer%20C21-6032B16EA7C1	\N	SET_PARAMETER_VALUES	Aplicar template: Archer C21 - Guest Nuvyon ON	SUCCESS	CONNECTION_REQUEST	\N	\N	admin@nuvyon.com	{"templateId": "426367d2-5a14-42fc-849b-4a83cd8fcb9b", "templateName": "Archer C21 - Guest Nuvyon ON", "parameterCount": 8}	{"task": {"_id": "6a412bd1e9437dbd5ee08417", "name": "setParameterValues", "device": "6032B1-Archer%20C21-6032B16EA7C1", "timestamp": "2026-06-28T14:12:33.756Z", "parameterValues": [["Device.WiFi.SSID.2.Enable", true, "xsd:boolean"], ["Device.WiFi.SSID.2.SSID", "NUVYON_WIFI", "xsd:string"], ["Device.WiFi.AccessPoint.2.Enable", true, "xsd:boolean"], ["Device.WiFi.AccessPoint.2.SSIDAdvertisementEnabled", true, "xsd:boolean"], ["Device.WiFi.SSID.4.Enable", true, "xsd:boolean"], ["Device.WiFi.SSID.4.SSID", "NUVYON_WIFI_5G", "xsd:string"], ["Device.WiFi.AccessPoint.4.Enable", true, "xsd:boolean"], ["Device.WiFi.AccessPoint.4.SSIDAdvertisementEnabled", true, "xsd:boolean"]]}}	\N	\N	2026-06-28 14:12:33.725+00	2026-06-28 14:12:35.772+00	2047	2026-06-28 14:12:33.726011+00	2026-06-28 14:12:35.776217+00
ad278b1a-782f-4e9a-acc7-a8a5495128cb	6032B1-Archer%20C21-6032B16EA7C1	\N	SET_PARAMETER_VALUES	Aplicar template: Archer C21 - Guest Nuvyon OFF	SUCCESS	CONNECTION_REQUEST	\N	\N	admin@nuvyon.com	{"templateId": "5d93cab6-4abd-426e-8e91-8ca96fa53c8b", "templateName": "Archer C21 - Guest Nuvyon OFF", "parameterCount": 4}	{"task": {"_id": "6a412d449ad18c879466a224", "name": "setParameterValues", "device": "6032B1-Archer%20C21-6032B16EA7C1", "timestamp": "2026-06-28T14:18:44.946Z", "parameterValues": [["Device.WiFi.SSID.2.Enable", false, "xsd:boolean"], ["Device.WiFi.AccessPoint.2.Enable", false, "xsd:boolean"], ["Device.WiFi.SSID.4.Enable", false, "xsd:boolean"], ["Device.WiFi.AccessPoint.4.Enable", false, "xsd:boolean"]]}}	\N	\N	2026-06-28 14:18:44.915+00	2026-06-28 14:18:46.956+00	2041	2026-06-28 14:18:44.917231+00	2026-06-28 14:18:46.963501+00
0ceb92ed-a83c-4434-9c8b-3108f0f0bd05	6032B1-Archer%20C21-6032B16EA7C1	\N	SET_PARAMETER_VALUES	Aplicar template: Archer C21 - TR-069 Operacional	SUCCESS	CONNECTION_REQUEST	\N	\N	admin@nuvyon.com	{"templateId": "0fad2aec-4f68-48f7-a696-c12028dedf57", "templateName": "Archer C21 - TR-069 Operacional", "parameterCount": 2}	{"task": {"_id": "6a412fec9ad18c879466a225", "name": "setParameterValues", "device": "6032B1-Archer%20C21-6032B16EA7C1", "timestamp": "2026-06-28T14:30:04.292Z", "parameterValues": [["Device.ManagementServer.PeriodicInformEnable", true, "xsd:boolean"], ["Device.ManagementServer.PeriodicInformInterval", 30, "xsd:unsignedInt"]]}}	\N	\N	2026-06-28 14:30:04.255+00	2026-06-28 14:30:06.303+00	2048	2026-06-28 14:30:04.256411+00	2026-06-28 14:30:06.305859+00
de237e6a-f20a-4fd6-88f9-f52e739c70db	6032B1-Archer%20C21-6032B16EA7C1	\N	SET_PARAMETER_VALUES	Aplicar template em lote: Archer C21 - TR-069 Operacional	SUCCESS	CONNECTION_REQUEST	\N	\N	admin@nuvyon.com	{"bulk": true, "filters": {"model": "Archer C21", "status": "online", "productClass": "Archer C21"}, "templateId": "0fad2aec-4f68-48f7-a696-c12028dedf57", "templateName": "Archer C21 - TR-069 Operacional", "parameterCount": 2}	{"bulk": true, "task": {"_id": "6a41317e9ad18c879466a226", "name": "setParameterValues", "device": "6032B1-Archer%20C21-6032B16EA7C1", "timestamp": "2026-06-28T14:36:46.873Z", "parameterValues": [["Device.ManagementServer.PeriodicInformEnable", true, "xsd:boolean"], ["Device.ManagementServer.PeriodicInformInterval", 30, "xsd:unsignedInt"]]}}	\N	\N	2026-06-28 14:36:46.677+00	2026-06-28 14:36:48.897+00	2220	2026-06-28 14:36:46.695219+00	2026-06-28 14:36:48.902042+00
9fe11b0d-c31f-4ae3-8a7c-041e22a66e90	6032B1-Archer%20C21-6032B16EA7C1	\N	SET_PARAMETER_VALUES	Aplicar template no grupo Archer C21 de teste: Archer C21 - TR-069 Operacional	SUCCESS	CONNECTION_REQUEST	\N	\N	admin@nuvyon.com	{"bulk": true, "groupId": "35d37200-7819-4f2a-8439-4806ba47e799", "groupName": "Archer C21 de teste", "templateId": "0fad2aec-4f68-48f7-a696-c12028dedf57", "groupFilters": {"model": "Archer C21", "status": "online", "manufacturer": "TP-Link", "productClass": "Archer C21"}, "templateName": "Archer C21 - TR-069 Operacional", "parameterCount": 2}	{"task": {"_id": "6a413b6ee9437dbd5ee08418", "name": "setParameterValues", "device": "6032B1-Archer%20C21-6032B16EA7C1", "timestamp": "2026-06-28T15:19:10.239Z", "parameterValues": [["Device.ManagementServer.PeriodicInformEnable", true, "xsd:boolean"], ["Device.ManagementServer.PeriodicInformInterval", 30, "xsd:unsignedInt"]]}, "groupId": "35d37200-7819-4f2a-8439-4806ba47e799", "templateId": "0fad2aec-4f68-48f7-a696-c12028dedf57"}	\N	\N	2026-06-28 15:19:10.2+00	2026-06-28 15:19:12.26+00	2060	2026-06-28 15:19:10.200752+00	2026-06-28 15:19:12.266717+00
7ad12fc3-facc-4be0-9c69-5b54515bf30a	6032B1-Archer%20C21-6032B16EA7C1	\N	SET_PARAMETER_VALUES	Aplicar template no grupo Archer C21 de teste: Archer C21 - Guest Nuvyon ON	SUCCESS	CONNECTION_REQUEST	\N	\N	admin@nuvyon.com	{"bulk": true, "groupId": "35d37200-7819-4f2a-8439-4806ba47e799", "groupName": "Archer C21 de teste", "templateId": "426367d2-5a14-42fc-849b-4a83cd8fcb9b", "groupFilters": {"model": "Archer C21", "status": "online", "manufacturer": "TP-Link", "productClass": "Archer C21"}, "templateName": "Archer C21 - Guest Nuvyon ON", "parameterCount": 8}	{"task": {"_id": "6a413bcf9ad18c879466a227", "name": "setParameterValues", "device": "6032B1-Archer%20C21-6032B16EA7C1", "timestamp": "2026-06-28T15:20:47.367Z", "parameterValues": [["Device.WiFi.SSID.2.Enable", true, "xsd:boolean"], ["Device.WiFi.SSID.2.SSID", "NUVYON_WIFI", "xsd:string"], ["Device.WiFi.AccessPoint.2.Enable", true, "xsd:boolean"], ["Device.WiFi.AccessPoint.2.SSIDAdvertisementEnabled", true, "xsd:boolean"], ["Device.WiFi.SSID.4.Enable", true, "xsd:boolean"], ["Device.WiFi.SSID.4.SSID", "NUVYON_WIFI_5G", "xsd:string"], ["Device.WiFi.AccessPoint.4.Enable", true, "xsd:boolean"], ["Device.WiFi.AccessPoint.4.SSIDAdvertisementEnabled", true, "xsd:boolean"]]}, "groupId": "35d37200-7819-4f2a-8439-4806ba47e799", "templateId": "426367d2-5a14-42fc-849b-4a83cd8fcb9b"}	\N	\N	2026-06-28 15:20:47.334+00	2026-06-28 15:20:49.377+00	2043	2026-06-28 15:20:47.334945+00	2026-06-28 15:20:49.381661+00
edbca40e-ccb5-4066-9844-3371b904568f	6032B1-Archer%20C21-6032B16EA7C1	\N	SET_PARAMETER_VALUES	Aplicar template no grupo Archer C21 de teste: Archer C21 - Guest Nuvyon OFF	SUCCESS	CONNECTION_REQUEST	\N	\N	admin@nuvyon.com	{"bulk": true, "groupId": "35d37200-7819-4f2a-8439-4806ba47e799", "groupName": "Archer C21 de teste", "templateId": "5d93cab6-4abd-426e-8e91-8ca96fa53c8b", "groupFilters": {"model": "Archer C21", "status": "online", "manufacturer": "TP-Link", "productClass": "Archer C21"}, "templateName": "Archer C21 - Guest Nuvyon OFF", "parameterCount": 4}	{"task": {"_id": "6a413fa0e9437dbd5ee08419", "name": "setParameterValues", "device": "6032B1-Archer%20C21-6032B16EA7C1", "timestamp": "2026-06-28T15:37:04.558Z", "parameterValues": [["Device.WiFi.SSID.2.Enable", false, "xsd:boolean"], ["Device.WiFi.AccessPoint.2.Enable", false, "xsd:boolean"], ["Device.WiFi.SSID.4.Enable", false, "xsd:boolean"], ["Device.WiFi.AccessPoint.4.Enable", false, "xsd:boolean"]]}, "groupId": "35d37200-7819-4f2a-8439-4806ba47e799", "templateId": "5d93cab6-4abd-426e-8e91-8ca96fa53c8b"}	\N	\N	2026-06-28 15:37:04.53+00	2026-06-28 15:37:06.573+00	2043	2026-06-28 15:37:04.531135+00	2026-06-28 15:37:06.576383+00
3350f420-961f-45e8-bf04-9ced59cfc684	6032B1-Archer%20C21-6032B16EA7C1	\N	REFRESH_OBJECT	Refresh Device.ManagementServer	SUCCESS	CONNECTION_REQUEST	Device.ManagementServer	\N	admin@nuvyon.com	{"deviceId": "6032B1-Archer%20C21-6032B16EA7C1", "objectName": "Device.ManagementServer", "useConnectionRequest": true}	{"task": {"_id": "6a41502ce9437dbd5ee0841a", "name": "refreshObject", "device": "6032B1-Archer%20C21-6032B16EA7C1", "timestamp": "2026-06-28T16:47:40.292Z", "objectName": "Device.ManagementServer"}}	\N	\N	2026-06-28 16:47:40.247+00	2026-06-28 16:47:42.304+00	2057	2026-06-28 16:47:40.260285+00	2026-06-28 16:47:42.30914+00
cde7bc13-8e84-49bd-ab47-4b8ba77b08c7	6032B1-Archer%20C21-6032B16EA7C1	\N	REFRESH_OBJECT	Refresh geral	SUCCESS	CONNECTION_REQUEST	\N	\N	admin@nuvyon.com	{"deviceId": "6032B1-Archer%20C21-6032B16EA7C1", "objectName": "", "useConnectionRequest": true}	{"task": {"_id": "6a415039e9437dbd5ee0841b", "name": "refreshObject", "device": "6032B1-Archer%20C21-6032B16EA7C1", "timestamp": "2026-06-28T16:47:53.369Z", "objectName": ""}}	\N	\N	2026-06-28 16:47:53.32+00	2026-06-28 16:47:55.381+00	2061	2026-06-28 16:47:53.340307+00	2026-06-28 16:47:55.38407+00
64e001c0-ad5f-4bdd-ae73-6e11aa3c6e9f	6032B1-Archer%20C21-6032B16EA7C1	\N	TEST_CONNECTION_REQUEST	Teste de Connection Request	SUCCESS	DIRECT_HTTP_TEST	\N	\N	admin@nuvyon.com	{"deviceId": "6032B1-Archer%20C21-6032B16EA7C1"}	{"url": "http://192.168.0.14:7547/tp_cwmp", "server": null, "message": "Timeout ao tentar acessar o Connection Request.", "authType": "Unknown", "testedAt": "2026-06-28T16:49:53.858Z", "latencyMs": 5035, "reachable": false, "authHeader": null, "statusCode": null}	\N	\N	2026-06-28 16:49:48.795+00	2026-06-28 16:49:53.868+00	5073	2026-06-28 16:49:48.796105+00	2026-06-28 16:49:53.874527+00
b6d8398f-fbf1-43fd-82f5-825208722610	6032B1-Archer%20C21-6032B16EA7C1	\N	REFRESH_OBJECT	Refresh Device	SUCCESS	CONNECTION_REQUEST	Device	\N	admin@nuvyon.com	{"deviceId": "6032B1-Archer%20C21-6032B16EA7C1", "objectName": "Device", "useConnectionRequest": true}	{"task": {"_id": "6a4150ba9ad18c879466a228", "name": "refreshObject", "device": "6032B1-Archer%20C21-6032B16EA7C1", "timestamp": "2026-06-28T16:50:02.181Z", "objectName": "Device"}}	\N	\N	2026-06-28 16:50:02.148+00	2026-06-28 16:50:04.196+00	2048	2026-06-28 16:50:02.149682+00	2026-06-28 16:50:04.200214+00
fc37284a-3eea-4100-b2f3-7b1ce93cc579	6032B1-Archer%20C21-6032B16EA7C1	\N	REFRESH_OBJECT	Refresh Device.IP	SUCCESS	CONNECTION_REQUEST	Device.IP	\N	admin@nuvyon.com	{"deviceId": "6032B1-Archer%20C21-6032B16EA7C1", "objectName": "Device.IP", "useConnectionRequest": true}	{"task": {"_id": "6a4150c4e9437dbd5ee0841c", "name": "refreshObject", "device": "6032B1-Archer%20C21-6032B16EA7C1", "timestamp": "2026-06-28T16:50:12.292Z", "objectName": "Device.IP"}}	\N	\N	2026-06-28 16:50:12.267+00	2026-06-28 16:50:14.304+00	2037	2026-06-28 16:50:12.268144+00	2026-06-28 16:50:14.306633+00
\.


--
-- Data for Name: device_alert_states; Type: TABLE DATA; Schema: public; Owner: acs_admin
--

COPY public.device_alert_states (id, "alertKey", "deviceId", severity, category, title, description, status, "occurrenceCount", "firstSeenAt", "lastSeenAt", "acknowledgedByEmail", "acknowledgedAt", "silencedByEmail", "silencedAt", "silencedUntil", note, "resolvedByEmail", "resolvedAt", "resolutionNote", "createdAt", "updatedAt") FROM stdin;
fd641baf-edb6-46a1-95eb-4b92e5a9b9a5	DISCOVERYSERVICE-DISCOVERYSERVICE-XnanqInIXl:offline	DISCOVERYSERVICE-DISCOVERYSERVICE-XnanqInIXl	critical	connectivity	CPE offline	O dispositivo está offline ou sem inform dentro do limite operacional.	RESOLVED	2	2026-07-05 12:03:38.984+00	2026-07-05 12:03:39.119+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.011007+00	2026-07-05 12:03:39.139+00
13d982d3-ef7b-483c-8c9e-706d29a5bb8b	DISCOVERYSERVICE-DISCOVERYSERVICE-XnanqInIXl:last-contact-over-2h	DISCOVERYSERVICE-DISCOVERYSERVICE-XnanqInIXl	critical	inform	Último inform acima de 2 horas	Último inform há aproximadamente 9335 minutos.	RESOLVED	2	2026-07-05 12:03:38.984+00	2026-07-05 12:03:39.119+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.04642+00	2026-07-05 12:03:39.15+00
b64a2e59-0694-4ca2-80fc-148844a2aa0b	DISCOVERYSERVICE-DISCOVERYSERVICE-tiWxhBqxee:offline	DISCOVERYSERVICE-DISCOVERYSERVICE-tiWxhBqxee	critical	connectivity	CPE offline	O dispositivo está offline ou sem inform dentro do limite operacional.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.494532+00	2026-07-05 12:03:39.494+00
24e0b4e3-54d3-49a1-ab33-516189b10999	DISCOVERYSERVICE-DISCOVERYSERVICE-XEJKEnnyhM:missing-model	DISCOVERYSERVICE-DISCOVERYSERVICE-XEJKEnnyhM	warning	identity	Modelo não identificado	O modelo do CPE não foi identificado. Isso dificulta templates, grupos e provisionamento seguro.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.487216+00	2026-07-05 12:03:39.487+00
9bce1e8b-d777-4653-889f-d1327a3eb6b0	DISCOVERYSERVICE-DISCOVERYSERVICE-XEJKEnnyhM:missing-serial	DISCOVERYSERVICE-DISCOVERYSERVICE-XEJKEnnyhM	warning	identity	Serial não identificado	O número de série do equipamento não foi identificado corretamente.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.480536+00	2026-07-05 12:03:39.48+00
d65fb1d9-9c2a-4cdf-a701-ad2dfbc48bb0	DISCOVERYSERVICE-DISCOVERYSERVICE-XEJKEnnyhM:invalid-wan-ip	DISCOVERYSERVICE-DISCOVERYSERVICE-XEJKEnnyhM	warning	ip	IP WAN inválido ou ausente	O ACS não identificou um IP WAN válido. Pode indicar CPE sem PPPoE, bridge, AP, laboratório ou parâmetro WAN não sincronizado.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.475848+00	2026-07-05 12:03:39.475+00
d31d2100-5992-41d6-ae5e-c1e9ee7cebb1	DISCOVERYSERVICE-DISCOVERYSERVICE-XEJKEnnyhM:last-contact-over-2h	DISCOVERYSERVICE-DISCOVERYSERVICE-XEJKEnnyhM	critical	inform	Último inform acima de 2 horas	Último inform há aproximadamente 4657 minutos.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.471309+00	2026-07-05 12:03:39.471+00
54a7114f-97ab-49da-a0b4-ecf652f00643	DISCOVERYSERVICE-DISCOVERYSERVICE-XEJKEnnyhM:offline	DISCOVERYSERVICE-DISCOVERYSERVICE-XEJKEnnyhM	critical	connectivity	CPE offline	O dispositivo está offline ou sem inform dentro do limite operacional.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.465503+00	2026-07-05 12:03:39.465+00
b07364c8-7ffd-4082-bafe-47689555fd53	DISCOVERYSERVICE-DISCOVERYSERVICE-yyjrLDrndQ:missing-model	DISCOVERYSERVICE-DISCOVERYSERVICE-yyjrLDrndQ	warning	identity	Modelo não identificado	O modelo do CPE não foi identificado. Isso dificulta templates, grupos e provisionamento seguro.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.461137+00	2026-07-05 12:03:39.461+00
48560562-991c-43f1-93df-2952420069bf	DISCOVERYSERVICE-DISCOVERYSERVICE-yyjrLDrndQ:last-contact-over-2h	DISCOVERYSERVICE-DISCOVERYSERVICE-yyjrLDrndQ	critical	inform	Último inform acima de 2 horas	Último inform há aproximadamente 4996 minutos.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.446474+00	2026-07-05 12:03:39.446+00
228e4207-b865-49ca-a9f9-9e729160723b	DISCOVERYSERVICE-DISCOVERYSERVICE-yyjrLDrndQ:offline	DISCOVERYSERVICE-DISCOVERYSERVICE-yyjrLDrndQ	critical	connectivity	CPE offline	O dispositivo está offline ou sem inform dentro do limite operacional.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.44208+00	2026-07-05 12:03:39.442+00
f5ce76e9-b179-433a-b63d-e010422718a8	DISCOVERYSERVICE-DISCOVERYSERVICE-EHWnIbPtAU:missing-model	DISCOVERYSERVICE-DISCOVERYSERVICE-EHWnIbPtAU	warning	identity	Modelo não identificado	O modelo do CPE não foi identificado. Isso dificulta templates, grupos e provisionamento seguro.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.438026+00	2026-07-05 12:03:39.438+00
c692d408-a11f-4ae7-99bb-97da9e8bec40	DISCOVERYSERVICE-DISCOVERYSERVICE-EHWnIbPtAU:missing-serial	DISCOVERYSERVICE-DISCOVERYSERVICE-EHWnIbPtAU	warning	identity	Serial não identificado	O número de série do equipamento não foi identificado corretamente.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.43365+00	2026-07-05 12:03:39.433+00
b4fd17d5-2239-41bf-9933-8109578fe9fb	DISCOVERYSERVICE-DISCOVERYSERVICE-EHWnIbPtAU:invalid-wan-ip	DISCOVERYSERVICE-DISCOVERYSERVICE-EHWnIbPtAU	warning	ip	IP WAN inválido ou ausente	O ACS não identificou um IP WAN válido. Pode indicar CPE sem PPPoE, bridge, AP, laboratório ou parâmetro WAN não sincronizado.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.42909+00	2026-07-05 12:03:39.429+00
f48991fa-fe8f-4b13-b0da-635b5b16de7e	DISCOVERYSERVICE-DISCOVERYSERVICE-EHWnIbPtAU:last-contact-over-2h	DISCOVERYSERVICE-DISCOVERYSERVICE-EHWnIbPtAU	critical	inform	Último inform acima de 2 horas	Último inform há aproximadamente 6265 minutos.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.424058+00	2026-07-05 12:03:39.424+00
7440a2cb-797b-4f14-bc8b-db59934907df	DISCOVERYSERVICE-DISCOVERYSERVICE-ablmkUWWpv:missing-model	DISCOVERYSERVICE-DISCOVERYSERVICE-ablmkUWWpv	warning	identity	Modelo não identificado	O modelo do CPE não foi identificado. Isso dificulta templates, grupos e provisionamento seguro.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.413886+00	2026-07-05 12:03:39.413+00
3412950a-cc00-40dc-a2bf-3e2d89f99d0c	DISCOVERYSERVICE-DISCOVERYSERVICE-ablmkUWWpv:missing-serial	DISCOVERYSERVICE-DISCOVERYSERVICE-ablmkUWWpv	warning	identity	Serial não identificado	O número de série do equipamento não foi identificado corretamente.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.406486+00	2026-07-05 12:03:39.406+00
fca0c98b-1300-4731-8f6c-a510b47a68f4	DISCOVERYSERVICE-DISCOVERYSERVICE-XnanqInIXl:missing-serial	DISCOVERYSERVICE-DISCOVERYSERVICE-XnanqInIXl	warning	identity	Serial não identificado	O número de série do equipamento não foi identificado corretamente.	RESOLVED	2	2026-07-05 12:03:38.984+00	2026-07-05 12:03:39.119+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.112453+00	2026-07-05 12:03:39.174+00
5789f5db-15a9-464f-844d-f960dd80442c	DISCOVERYSERVICE-DISCOVERYSERVICE-ablmkUWWpv:invalid-wan-ip	DISCOVERYSERVICE-DISCOVERYSERVICE-ablmkUWWpv	warning	ip	IP WAN inválido ou ausente	O ACS não identificou um IP WAN válido. Pode indicar CPE sem PPPoE, bridge, AP, laboratório ou parâmetro WAN não sincronizado.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.401868+00	2026-07-05 12:03:39.401+00
bbcfcfba-4083-48ca-8463-d2f7e13db88c	DISCOVERYSERVICE-DISCOVERYSERVICE-ablmkUWWpv:last-contact-over-2h	DISCOVERYSERVICE-DISCOVERYSERVICE-ablmkUWWpv	critical	inform	Último inform acima de 2 horas	Último inform há aproximadamente 6399 minutos.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.39639+00	2026-07-05 12:03:39.396+00
ddd0acde-a538-4157-81f9-890ee0b5fbd0	DISCOVERYSERVICE-DISCOVERYSERVICE-COPMJUQIiV:missing-model	DISCOVERYSERVICE-DISCOVERYSERVICE-COPMJUQIiV	warning	identity	Modelo não identificado	O modelo do CPE não foi identificado. Isso dificulta templates, grupos e provisionamento seguro.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.386453+00	2026-07-05 12:03:39.386+00
956d4025-7a1d-425f-97d7-0750d7cb1589	DISCOVERYSERVICE-DISCOVERYSERVICE-COPMJUQIiV:missing-serial	DISCOVERYSERVICE-DISCOVERYSERVICE-COPMJUQIiV	warning	identity	Serial não identificado	O número de série do equipamento não foi identificado corretamente.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.381677+00	2026-07-05 12:03:39.381+00
968a519d-e245-4118-b36c-2986baaab8ef	DISCOVERYSERVICE-DISCOVERYSERVICE-COPMJUQIiV:invalid-wan-ip	DISCOVERYSERVICE-DISCOVERYSERVICE-COPMJUQIiV	warning	ip	IP WAN inválido ou ausente	O ACS não identificou um IP WAN válido. Pode indicar CPE sem PPPoE, bridge, AP, laboratório ou parâmetro WAN não sincronizado.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.373754+00	2026-07-05 12:03:39.373+00
104cd43c-6602-45fc-bfa2-31831541965d	DISCOVERYSERVICE-DISCOVERYSERVICE-COPMJUQIiV:last-contact-over-2h	DISCOVERYSERVICE-DISCOVERYSERVICE-COPMJUQIiV	critical	inform	Último inform acima de 2 horas	Último inform há aproximadamente 7588 minutos.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.356132+00	2026-07-05 12:03:39.356+00
ac46a42a-4ecb-4e38-8e00-bf8c3dd9b71a	DISCOVERYSERVICE-DISCOVERYSERVICE-COPMJUQIiV:offline	DISCOVERYSERVICE-DISCOVERYSERVICE-COPMJUQIiV	critical	connectivity	CPE offline	O dispositivo está offline ou sem inform dentro do limite operacional.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.338382+00	2026-07-05 12:03:39.338+00
6154c120-5953-4e2e-a42e-8a643feeccdb	DISCOVERYSERVICE-DISCOVERYSERVICE-lYFBnpMITM:missing-model	DISCOVERYSERVICE-DISCOVERYSERVICE-lYFBnpMITM	warning	identity	Modelo não identificado	O modelo do CPE não foi identificado. Isso dificulta templates, grupos e provisionamento seguro.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.331015+00	2026-07-05 12:03:39.331+00
95f5d14c-8fc1-41c4-b5a5-ebbbad36f91a	DISCOVERYSERVICE-DISCOVERYSERVICE-lYFBnpMITM:invalid-wan-ip	DISCOVERYSERVICE-DISCOVERYSERVICE-lYFBnpMITM	warning	ip	IP WAN inválido ou ausente	O ACS não identificou um IP WAN válido. Pode indicar CPE sem PPPoE, bridge, AP, laboratório ou parâmetro WAN não sincronizado.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.31382+00	2026-07-05 12:03:39.313+00
04ee43d8-abdc-4d6f-94df-b358654e7473	DISCOVERYSERVICE-DISCOVERYSERVICE-lYFBnpMITM:last-contact-over-2h	DISCOVERYSERVICE-DISCOVERYSERVICE-lYFBnpMITM	critical	inform	Último inform acima de 2 horas	Último inform há aproximadamente 8188 minutos.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.258914+00	2026-07-05 12:03:39.258+00
292f4bf5-da62-42ed-9594-a6a120bd405a	DISCOVERYSERVICE-DISCOVERYSERVICE-lYFBnpMITM:offline	DISCOVERYSERVICE-DISCOVERYSERVICE-lYFBnpMITM	critical	connectivity	CPE offline	O dispositivo está offline ou sem inform dentro do limite operacional.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.176789+00	2026-07-05 12:03:39.176+00
1c95ec89-b39f-44e0-9b95-8dfe9d3d2d52	DISCOVERYSERVICE-DISCOVERYSERVICE-NHcQAnWNfG:missing-model	DISCOVERYSERVICE-DISCOVERYSERVICE-NHcQAnWNfG	warning	identity	Modelo não identificado	O modelo do CPE não foi identificado. Isso dificulta templates, grupos e provisionamento seguro.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.162972+00	2026-07-05 12:03:39.162+00
29d2beae-59d2-4c3b-82ae-8c5524f89f6a	DISCOVERYSERVICE-DISCOVERYSERVICE-NHcQAnWNfG:missing-serial	DISCOVERYSERVICE-DISCOVERYSERVICE-NHcQAnWNfG	warning	identity	Serial não identificado	O número de série do equipamento não foi identificado corretamente.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.155788+00	2026-07-05 12:03:39.155+00
285df649-382f-4244-9b54-2d77cae3d086	DISCOVERYSERVICE-DISCOVERYSERVICE-NHcQAnWNfG:invalid-wan-ip	DISCOVERYSERVICE-DISCOVERYSERVICE-NHcQAnWNfG	warning	ip	IP WAN inválido ou ausente	O ACS não identificou um IP WAN válido. Pode indicar CPE sem PPPoE, bridge, AP, laboratório ou parâmetro WAN não sincronizado.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.15004+00	2026-07-05 12:03:39.15+00
c12159fa-6ac2-4504-9164-bef576155092	DISCOVERYSERVICE-DISCOVERYSERVICE-NHcQAnWNfG:last-contact-over-2h	DISCOVERYSERVICE-DISCOVERYSERVICE-NHcQAnWNfG	critical	inform	Último inform acima de 2 horas	Último inform há aproximadamente 8921 minutos.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.142681+00	2026-07-05 12:03:39.142+00
fcac8e2d-cbb5-4ef4-a763-8492b19d5f38	DISCOVERYSERVICE-DISCOVERYSERVICE-NHcQAnWNfG:offline	DISCOVERYSERVICE-DISCOVERYSERVICE-NHcQAnWNfG	critical	connectivity	CPE offline	O dispositivo está offline ou sem inform dentro do limite operacional.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.132268+00	2026-07-05 12:03:39.132+00
d6b3118d-9c7e-455d-8d0a-cf11646af3de	DISCOVERYSERVICE-DISCOVERYSERVICE-XnanqInIXl:missing-model	DISCOVERYSERVICE-DISCOVERYSERVICE-XnanqInIXl	warning	identity	Modelo não identificado	O modelo do CPE não foi identificado. Isso dificulta templates, grupos e provisionamento seguro.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.122212+00	2026-07-05 12:03:39.122+00
28d7f9d5-f827-4c20-9aa4-845286fa2f0b	DECADE-G3000E-G3000E%2D9799109101:last-contact-over-2h	DECADE-G3000E-G3000E%2D9799109101	critical	inform	Último inform acima de 2 horas	Último inform há aproximadamente 470 minutos.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.600013+00	2026-07-05 12:03:39.6+00
d0c9d4df-78ed-4f64-9247-3a4a9db2e61b	DECADE-G3000E-G3000E%2D9799109101:offline	DECADE-G3000E-G3000E%2D9799109101	critical	connectivity	CPE offline	O dispositivo está offline ou sem inform dentro do limite operacional.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.594504+00	2026-07-05 12:03:39.594+00
4588b485-f2ad-40a3-b2f2-8d513df99a17	DISCOVERYSERVICE-DISCOVERYSERVICE-DJvSqGHeaJ:missing-model	DISCOVERYSERVICE-DISCOVERYSERVICE-DJvSqGHeaJ	warning	identity	Modelo não identificado	O modelo do CPE não foi identificado. Isso dificulta templates, grupos e provisionamento seguro.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.59031+00	2026-07-05 12:05:15.329572+00
004c8645-3f23-401b-ab77-afd95f74ef1f	DISCOVERYSERVICE-DISCOVERYSERVICE-DJvSqGHeaJ:missing-serial	DISCOVERYSERVICE-DISCOVERYSERVICE-DJvSqGHeaJ	warning	identity	Serial não identificado	O número de série do equipamento não foi identificado corretamente.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.5858+00	2026-07-05 12:05:15.340697+00
2bdf45f5-19b2-4703-b0cd-b513cd7b73a4	DISCOVERYSERVICE-DISCOVERYSERVICE-DJvSqGHeaJ:invalid-wan-ip	DISCOVERYSERVICE-DISCOVERYSERVICE-DJvSqGHeaJ	warning	ip	IP WAN inválido ou ausente	O ACS não identificou um IP WAN válido. Pode indicar CPE sem PPPoE, bridge, AP, laboratório ou parâmetro WAN não sincronizado.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.580661+00	2026-07-05 12:05:15.354732+00
b9a614b8-15dc-4fd3-9521-86b78905d55a	DISCOVERYSERVICE-DISCOVERYSERVICE-DJvSqGHeaJ:last-contact-over-2h	DISCOVERYSERVICE-DISCOVERYSERVICE-DJvSqGHeaJ	critical	inform	Último inform acima de 2 horas	Último inform há aproximadamente 1011 minutos.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.575923+00	2026-07-05 12:05:15.363204+00
90489023-11b9-45b5-af6c-e087e76d0413	DISCOVERYSERVICE-DISCOVERYSERVICE-FfmuceOaWp:missing-model	DISCOVERYSERVICE-DISCOVERYSERVICE-FfmuceOaWp	warning	identity	Modelo não identificado	O modelo do CPE não foi identificado. Isso dificulta templates, grupos e provisionamento seguro.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.560206+00	2026-07-05 12:03:39.56+00
904a5ca9-12eb-4bdd-86bd-a0ace46b5f30	DISCOVERYSERVICE-DISCOVERYSERVICE-FfmuceOaWp:missing-serial	DISCOVERYSERVICE-DISCOVERYSERVICE-FfmuceOaWp	warning	identity	Serial não identificado	O número de série do equipamento não foi identificado corretamente.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.55622+00	2026-07-05 12:03:39.556+00
1cbc36f7-42c8-4b9d-9740-0675d6237ce3	DISCOVERYSERVICE-DISCOVERYSERVICE-FfmuceOaWp:invalid-wan-ip	DISCOVERYSERVICE-DISCOVERYSERVICE-FfmuceOaWp	warning	ip	IP WAN inválido ou ausente	O ACS não identificou um IP WAN válido. Pode indicar CPE sem PPPoE, bridge, AP, laboratório ou parâmetro WAN não sincronizado.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.552068+00	2026-07-05 12:03:39.552+00
b6152863-fd22-44aa-8398-9d4492a1d067	DISCOVERYSERVICE-DISCOVERYSERVICE-FfmuceOaWp:last-contact-over-2h	DISCOVERYSERVICE-DISCOVERYSERVICE-FfmuceOaWp	critical	inform	Último inform acima de 2 horas	Último inform há aproximadamente 1981 minutos.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.547739+00	2026-07-05 12:03:39.547+00
233a4764-d50c-4b78-8e2c-5310acccff52	DISCOVERYSERVICE-DISCOVERYSERVICE-jYrwYXipqN:missing-model	DISCOVERYSERVICE-DISCOVERYSERVICE-jYrwYXipqN	warning	identity	Modelo não identificado	O modelo do CPE não foi identificado. Isso dificulta templates, grupos e provisionamento seguro.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.539238+00	2026-07-05 12:03:39.539+00
5ebac70d-d34c-4b87-b9ba-cd5a4d7fcedb	DISCOVERYSERVICE-DISCOVERYSERVICE-jYrwYXipqN:missing-serial	DISCOVERYSERVICE-DISCOVERYSERVICE-jYrwYXipqN	warning	identity	Serial não identificado	O número de série do equipamento não foi identificado corretamente.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.535105+00	2026-07-05 12:03:39.535+00
ac84b021-2ca8-4d79-b79d-bb3f18ec0c59	DISCOVERYSERVICE-DISCOVERYSERVICE-jYrwYXipqN:last-contact-over-2h	DISCOVERYSERVICE-DISCOVERYSERVICE-jYrwYXipqN	critical	inform	Último inform acima de 2 horas	Último inform há aproximadamente 2477 minutos.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.524429+00	2026-07-05 12:03:39.524+00
041b3303-7077-4823-a9b6-b9f6c0c071ee	DISCOVERYSERVICE-DISCOVERYSERVICE-jYrwYXipqN:offline	DISCOVERYSERVICE-DISCOVERYSERVICE-jYrwYXipqN	critical	connectivity	CPE offline	O dispositivo está offline ou sem inform dentro do limite operacional.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.519135+00	2026-07-05 12:03:39.519+00
5b4657b1-d22e-4cc6-a40c-9b3d1485192f	DISCOVERYSERVICE-DISCOVERYSERVICE-tiWxhBqxee:missing-model	DISCOVERYSERVICE-DISCOVERYSERVICE-tiWxhBqxee	warning	identity	Modelo não identificado	O modelo do CPE não foi identificado. Isso dificulta templates, grupos e provisionamento seguro.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.512889+00	2026-07-05 12:03:39.512+00
fc75ac50-640c-4412-8b72-e7b203273607	DISCOVERYSERVICE-DISCOVERYSERVICE-tiWxhBqxee:missing-serial	DISCOVERYSERVICE-DISCOVERYSERVICE-tiWxhBqxee	warning	identity	Serial não identificado	O número de série do equipamento não foi identificado corretamente.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.508388+00	2026-07-05 12:03:39.508+00
1a8df3ca-902e-48bf-a617-ae804c7be769	DISCOVERYSERVICE-DISCOVERYSERVICE-tiWxhBqxee:invalid-wan-ip	DISCOVERYSERVICE-DISCOVERYSERVICE-tiWxhBqxee	warning	ip	IP WAN inválido ou ausente	O ACS não identificou um IP WAN válido. Pode indicar CPE sem PPPoE, bridge, AP, laboratório ou parâmetro WAN não sincronizado.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.503199+00	2026-07-05 12:03:39.503+00
5445eb46-ade9-48da-8306-9602b3346ab9	DISCOVERYSERVICE-DISCOVERYSERVICE-tiWxhBqxee:last-contact-over-2h	DISCOVERYSERVICE-DISCOVERYSERVICE-tiWxhBqxee	critical	inform	Último inform acima de 2 horas	Último inform há aproximadamente 3469 minutos.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.498884+00	2026-07-05 12:03:39.498+00
809e5f8a-1df2-41c4-8b0b-2b141c1ac921	6032B1-Archer%20C21-6032B16EA7C1:invalid-wan-ip	6032B1-Archer%20C21-6032B16EA7C1	info	ip	IP WAN ausente esperado pelo contexto operacional	O CPE está em um contexto operacional onde a ausência de IP WAN pode ser esperada. Esse alerta foi classificado como informativo para evitar falso positivo no NOC.	SILENCED	80	2026-06-28 16:08:04.908+00	2026-07-05 12:08:39.339+00	\N	\N	system	2026-06-28 17:37:47.659+00	\N	Silenciado automaticamente: modo operacional lab.	\N	\N	\N	2026-06-28 16:08:04.992918+00	2026-07-05 12:08:39.347919+00
96fb249d-c0be-4a46-aa7d-2c9127873d26	DISCOVERYSERVICE-DISCOVERYSERVICE-idDDaYkuUi:missing-model	DISCOVERYSERVICE-DISCOVERYSERVICE-idDDaYkuUi	warning	identity	Modelo não identificado	O modelo do CPE não foi identificado. Isso dificulta templates, grupos e provisionamento seguro.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.636513+00	2026-07-05 12:05:15.155065+00
83a10fb2-8092-463d-a873-80eff2aa8599	DISCOVERYSERVICE-DISCOVERYSERVICE-idDDaYkuUi:missing-serial	DISCOVERYSERVICE-DISCOVERYSERVICE-idDDaYkuUi	warning	identity	Serial não identificado	O número de série do equipamento não foi identificado corretamente.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.631454+00	2026-07-05 12:05:15.168664+00
744e5eb1-8f3a-4927-ab5f-f9d20e3e296e	DISCOVERYSERVICE-DISCOVERYSERVICE-idDDaYkuUi:invalid-wan-ip	DISCOVERYSERVICE-DISCOVERYSERVICE-idDDaYkuUi	warning	ip	IP WAN inválido ou ausente	O ACS não identificou um IP WAN válido. Pode indicar CPE sem PPPoE, bridge, AP, laboratório ou parâmetro WAN não sincronizado.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.626999+00	2026-07-05 12:05:15.184311+00
be7f2c00-dd73-4ca4-90a0-74da6b12d005	DISCOVERYSERVICE-DISCOVERYSERVICE-idDDaYkuUi:last-contact-over-2h	DISCOVERYSERVICE-DISCOVERYSERVICE-idDDaYkuUi	critical	inform	Último inform acima de 2 horas	Último inform há aproximadamente 365 minutos.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.622203+00	2026-07-05 12:03:39.622+00
ca8eb426-ed18-4d69-9d73-a8afde53367b	DISCOVERYSERVICE-DISCOVERYSERVICE-idDDaYkuUi:offline	DISCOVERYSERVICE-DISCOVERYSERVICE-idDDaYkuUi	critical	connectivity	CPE offline	O dispositivo está offline ou sem inform dentro do limite operacional.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.617874+00	2026-07-05 12:05:15.218362+00
6c583b5c-b6dc-4cbd-9978-b63fb511e24d	DECADE-G3000E-G3000E%2D9799109101:missing-model	DECADE-G3000E-G3000E%2D9799109101	warning	identity	Modelo não identificado	O modelo do CPE não foi identificado. Isso dificulta templates, grupos e provisionamento seguro.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.613201+00	2026-07-05 12:05:15.2327+00
11ea8c02-1a0b-4979-a58b-1102fccfa312	DECADE-G3000E-G3000E%2D9799109101:missing-serial	DECADE-G3000E-G3000E%2D9799109101	warning	identity	Serial não identificado	O número de série do equipamento não foi identificado corretamente.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.609047+00	2026-07-05 12:05:15.251371+00
1fb91644-aa53-4fc5-8c61-be4286e0b77c	DECADE-G3000E-G3000E%2D9799109101:invalid-wan-ip	DECADE-G3000E-G3000E%2D9799109101	warning	ip	IP WAN inválido ou ausente	O ACS não identificou um IP WAN válido. Pode indicar CPE sem PPPoE, bridge, AP, laboratório ou parâmetro WAN não sincronizado.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.605144+00	2026-07-05 12:05:15.271404+00
585d367b-8a15-4fd6-9d2c-1dc4125c2d69	DISCOVERYSERVICE-DISCOVERYSERVICE-DJvSqGHeaJ:offline	DISCOVERYSERVICE-DISCOVERYSERVICE-DJvSqGHeaJ	critical	connectivity	CPE offline	O dispositivo está offline ou sem inform dentro do limite operacional.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.569552+00	2026-07-05 12:05:15.37538+00
d58403e2-c1f9-4973-994f-1e26b08a1cf9	DISCOVERYSERVICE-DISCOVERYSERVICE-FfmuceOaWp:offline	DISCOVERYSERVICE-DISCOVERYSERVICE-FfmuceOaWp	critical	connectivity	CPE offline	O dispositivo está offline ou sem inform dentro do limite operacional.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.54351+00	2026-07-05 12:03:39.543+00
a74edb43-e2a7-462d-9062-985b928fbb06	DISCOVERYSERVICE-DISCOVERYSERVICE-jYrwYXipqN:invalid-wan-ip	DISCOVERYSERVICE-DISCOVERYSERVICE-jYrwYXipqN	warning	ip	IP WAN inválido ou ausente	O ACS não identificou um IP WAN válido. Pode indicar CPE sem PPPoE, bridge, AP, laboratório ou parâmetro WAN não sincronizado.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.53066+00	2026-07-05 12:03:39.53+00
30259acd-1de2-46c4-8c16-82c9d9b15cde	DISCOVERYSERVICE-DISCOVERYSERVICE-yyjrLDrndQ:missing-serial	DISCOVERYSERVICE-DISCOVERYSERVICE-yyjrLDrndQ	warning	identity	Serial não identificado	O número de série do equipamento não foi identificado corretamente.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.456902+00	2026-07-05 12:03:39.456+00
2c5b7a2e-9238-4b66-bebb-7202b0536a46	DISCOVERYSERVICE-DISCOVERYSERVICE-yyjrLDrndQ:invalid-wan-ip	DISCOVERYSERVICE-DISCOVERYSERVICE-yyjrLDrndQ	warning	ip	IP WAN inválido ou ausente	O ACS não identificou um IP WAN válido. Pode indicar CPE sem PPPoE, bridge, AP, laboratório ou parâmetro WAN não sincronizado.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.451639+00	2026-07-05 12:03:39.451+00
82ac5492-c57a-41f9-97c8-82da9d13bc00	DISCOVERYSERVICE-DISCOVERYSERVICE-EHWnIbPtAU:offline	DISCOVERYSERVICE-DISCOVERYSERVICE-EHWnIbPtAU	critical	connectivity	CPE offline	O dispositivo está offline ou sem inform dentro do limite operacional.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.419403+00	2026-07-05 12:03:39.419+00
1f2f646f-bea6-44c7-8de4-c5dca37044f2	DISCOVERYSERVICE-DISCOVERYSERVICE-ablmkUWWpv:offline	DISCOVERYSERVICE-DISCOVERYSERVICE-ablmkUWWpv	critical	connectivity	CPE offline	O dispositivo está offline ou sem inform dentro do limite operacional.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.392087+00	2026-07-05 12:03:39.392+00
ff50b315-e9aa-41d2-a3f0-8dd14e49bfdc	DISCOVERYSERVICE-DISCOVERYSERVICE-lYFBnpMITM:missing-serial	DISCOVERYSERVICE-DISCOVERYSERVICE-lYFBnpMITM	warning	identity	Serial não identificado	O número de série do equipamento não foi identificado corretamente.	RESOLVED	1	2026-07-05 12:03:38.984+00	2026-07-05 12:03:38.984+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.321873+00	2026-07-05 12:03:39.321+00
113a7b89-5c33-4cc5-801b-248f35cf9571	DISCOVERYSERVICE-DISCOVERYSERVICE-XnanqInIXl:invalid-wan-ip	DISCOVERYSERVICE-DISCOVERYSERVICE-XnanqInIXl	warning	ip	IP WAN inválido ou ausente	O ACS não identificou um IP WAN válido. Pode indicar CPE sem PPPoE, bridge, AP, laboratório ou parâmetro WAN não sincronizado.	RESOLVED	2	2026-07-05 12:03:38.984+00	2026-07-05 12:03:39.119+00	\N	\N	\N	\N	\N	\N	\N	2026-07-05 12:05:15.092+00	Resolvido automaticamente: alerta não está mais ativo.	2026-07-05 12:03:39.088249+00	2026-07-05 12:03:39.16+00
\.


--
-- Data for Name: device_groups; Type: TABLE DATA; Schema: public; Owner: acs_admin
--

COPY public.device_groups (id, name, description, filters, tags, status, "createdByEmail", "createdAt", "updatedAt") FROM stdin;
35d37200-7819-4f2a-8439-4806ba47e799	Archer C21 de teste	Grupo para testar templates no Archer C21.	{"model": "Archer C21", "status": "online", "manufacturer": "TP-Link", "productClass": "Archer C21"}	["teste", "tplink", "archer-c21"]	active	admin@nuvyon.com	2026-06-28 15:18:53.004704+00	2026-06-28 15:18:53.004704+00
\.


--
-- Data for Name: device_metadata; Type: TABLE DATA; Schema: public; Owner: acs_admin
--

COPY public.device_metadata (id, "deviceId", label, "customerName", "customerCode", city, address, "operationalMode", tags, notes, "updatedByEmail", "createdAt", "updatedAt") FROM stdin;
bd6bcedc-0eb6-4b1f-b25b-c41a6a3998bf	6032B1-Archer%20C21-6032B16EA7C1	Archer C21 bancada	Laboratório Nuvyon	\N	Mococa	\N	lab	["teste", "tplink", "archer"]	Equipamento atrás do roteador principal. IP WAN ausente é esperado neste cenário.	admin@nuvyon.com	2026-06-28 17:06:58.969687+00	2026-06-28 17:22:12.375598+00
\.


--
-- Data for Name: provisioning_jobs; Type: TABLE DATA; Schema: public; Owner: acs_admin
--

COPY public.provisioning_jobs (id, name, description, "groupId", "groupName", "templateId", "templateName", status, "targetCount", "successCount", "failedCount", "limit", "requestPayload", "resultPayload", "errorMessage", "createdByEmail", "startedAt", "finishedAt", "durationMs", "createdAt", "updatedAt") FROM stdin;
096e68e1-69bd-4938-82d1-acd859b6942a	Campanha: Archer C21 - Guest Nuvyon OFF → Archer C21 de teste	\N	35d37200-7819-4f2a-8439-4806ba47e799	Archer C21 de teste	5d93cab6-4abd-426e-8e91-8ca96fa53c8b	Archer C21 - Guest Nuvyon OFF	COMPLETED	1	1	0	20	{"limit": 20, "groupId": "35d37200-7819-4f2a-8439-4806ba47e799", "groupName": "Archer C21 de teste", "templateId": "5d93cab6-4abd-426e-8e91-8ca96fa53c8b", "groupFilters": {"model": "Archer C21", "status": "online", "manufacturer": "TP-Link", "productClass": "Archer C21"}, "templateName": "Archer C21 - Guest Nuvyon OFF", "parameterCount": 4}	{"dryRun": false, "groupId": "35d37200-7819-4f2a-8439-4806ba47e799", "results": [{"status": "SUCCESS", "actionId": "edbca40e-ccb5-4066-9844-3371b904568f", "deviceId": "6032B1-Archer%20C21-6032B16EA7C1"}], "groupName": "Archer C21 de teste", "templateId": "5d93cab6-4abd-426e-8e91-8ca96fa53c8b", "failedCount": 0, "matchedCount": 1, "successCount": 1, "templateName": "Archer C21 - Guest Nuvyon OFF"}	\N	admin@nuvyon.com	2026-06-28 15:37:04.486+00	2026-06-28 15:37:06.593+00	2093	2026-06-28 15:37:04.46773+00	2026-06-28 15:37:06.596058+00
\.


--
-- Data for Name: provisioning_templates; Type: TABLE DATA; Schema: public; Owner: acs_admin
--

COPY public.provisioning_templates (id, name, description, vendor, model, "productClass", parameters, tags, status, "createdByEmail", "createdAt", "updatedAt") FROM stdin;
65f7ed9c-9ab5-4fe5-93e1-eef862780429	TP-Link EC220-G5 - TR-069 Operacional	Ajusta Periodic Inform para operação ACS com atualização a cada 5 minutos.	TP-Link	EC220-G5	EC220-G5	[{"path": "Device.ManagementServer.PeriodicInformEnable", "type": "xsd:boolean", "value": true}, {"path": "Device.ManagementServer.PeriodicInformInterval", "type": "xsd:unsignedInt", "value": 300}]	["tplink", "tr069", "operacional"]	active	system	2026-06-28 14:02:49.901458+00	2026-06-28 14:02:49.901458+00
13c8f49d-60a1-4758-a034-55eaa0bddcfd	TP-Link EC220-G5 - Guest Nuvyon	Ativa SSID guest 2.4GHz e 5GHz com nomes padrão. Não altera senha.	TP-Link	EC220-G5	EC220-G5	[{"path": "Device.WiFi.SSID.2.Enable", "type": "xsd:boolean", "value": true}, {"path": "Device.WiFi.SSID.2.SSID", "type": "xsd:string", "value": "NUVYON_WIFI"}, {"path": "Device.WiFi.AccessPoint.2.Enable", "type": "xsd:boolean", "value": true}, {"path": "Device.WiFi.AccessPoint.2.SSIDAdvertisementEnabled", "type": "xsd:boolean", "value": true}, {"path": "Device.WiFi.SSID.4.Enable", "type": "xsd:boolean", "value": true}, {"path": "Device.WiFi.SSID.4.SSID", "type": "xsd:string", "value": "NUVYON_WIFI_5G"}, {"path": "Device.WiFi.AccessPoint.4.Enable", "type": "xsd:boolean", "value": true}, {"path": "Device.WiFi.AccessPoint.4.SSIDAdvertisementEnabled", "type": "xsd:boolean", "value": true}]	["tplink", "guest", "wifi"]	active	system	2026-06-28 14:02:49.928452+00	2026-06-28 14:02:49.928452+00
426367d2-5a14-42fc-849b-4a83cd8fcb9b	Archer C21 - Guest Nuvyon ON	Ativa os SSIDs guest 2.4GHz e 5GHz com nomes padrão Nuvyon. Não altera senha.	TP-Link	Archer C21	Archer C21	[{"path": "Device.WiFi.SSID.2.Enable", "type": "xsd:boolean", "value": true}, {"path": "Device.WiFi.SSID.2.SSID", "type": "xsd:string", "value": "NUVYON_WIFI"}, {"path": "Device.WiFi.AccessPoint.2.Enable", "type": "xsd:boolean", "value": true}, {"path": "Device.WiFi.AccessPoint.2.SSIDAdvertisementEnabled", "type": "xsd:boolean", "value": true}, {"path": "Device.WiFi.SSID.4.Enable", "type": "xsd:boolean", "value": true}, {"path": "Device.WiFi.SSID.4.SSID", "type": "xsd:string", "value": "NUVYON_WIFI_5G"}, {"path": "Device.WiFi.AccessPoint.4.Enable", "type": "xsd:boolean", "value": true}, {"path": "Device.WiFi.AccessPoint.4.SSIDAdvertisementEnabled", "type": "xsd:boolean", "value": true}]	["tplink", "archer-c21", "guest", "wifi"]	active	admin@nuvyon.com	2026-06-28 14:07:43.617448+00	2026-06-28 14:07:43.617448+00
5d93cab6-4abd-426e-8e91-8ca96fa53c8b	Archer C21 - Guest Nuvyon OFF	Desativa os SSIDs guest 2.4GHz e 5GHz.	TP-Link	Archer C21	Archer C21	[{"path": "Device.WiFi.SSID.2.Enable", "type": "xsd:boolean", "value": false}, {"path": "Device.WiFi.AccessPoint.2.Enable", "type": "xsd:boolean", "value": false}, {"path": "Device.WiFi.SSID.4.Enable", "type": "xsd:boolean", "value": false}, {"path": "Device.WiFi.AccessPoint.4.Enable", "type": "xsd:boolean", "value": false}]	["tplink", "archer-c21", "guest", "wifi", "off"]	active	admin@nuvyon.com	2026-06-28 14:07:56.94124+00	2026-06-28 14:07:56.94124+00
a179fb5a-a47f-49f6-ab6d-878381cd5aed	Archer C21 - Guest Oculto	Oculta o broadcast dos SSIDs guest 2.4GHz e 5GHz.	TP-Link	Archer C21	Archer C21	[{"path": "Device.WiFi.AccessPoint.2.SSIDAdvertisementEnabled", "type": "xsd:boolean", "value": false}, {"path": "Device.WiFi.AccessPoint.4.SSIDAdvertisementEnabled", "type": "xsd:boolean", "value": false}]	["tplink", "archer-c21", "guest", "hidden"]	active	admin@nuvyon.com	2026-06-28 14:08:09.284653+00	2026-06-28 14:08:09.284653+00
0fad2aec-4f68-48f7-a696-c12028dedf57	Archer C21 - TR-069 Operacional	Configura Periodic Inform para operação ACS a cada 5 minutos.	TP-Link	Archer C21	Archer C21	[{"path": "Device.ManagementServer.PeriodicInformEnable", "type": "xsd:boolean", "value": true}, {"path": "Device.ManagementServer.PeriodicInformInterval", "type": "xsd:unsignedInt", "value": 30}]	["tplink", "archer-c21", "tr069"]	active	admin@nuvyon.com	2026-06-28 14:07:29.859492+00	2026-06-28 14:29:40.942491+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: acs_admin
--

COPY public.users (id, email, "passwordHash", role, "isActive", "createdAt", "updatedAt") FROM stdin;
339c0964-dc9d-4e8d-aff1-b2f896238399	admin@nuvyon.com	$2b$10$qGsrz.7GYvi8RLydcG6Yzubh5MfqnNlpQW/N3GdRcWi6weK/uX5dq	ADMIN	t	2026-06-27 22:54:48.896659	2026-06-27 23:00:59.564032
\.


--
-- Name: provisioning_templates PK_0e57ec5736df52fec071bd5170e; Type: CONSTRAINT; Schema: public; Owner: acs_admin
--

ALTER TABLE ONLY public.provisioning_templates
    ADD CONSTRAINT "PK_0e57ec5736df52fec071bd5170e" PRIMARY KEY (id);


--
-- Name: device_alert_states PK_59a8c63237fb71c8d88d2835362; Type: CONSTRAINT; Schema: public; Owner: acs_admin
--

ALTER TABLE ONLY public.device_alert_states
    ADD CONSTRAINT "PK_59a8c63237fb71c8d88d2835362" PRIMARY KEY (id);


--
-- Name: device_metadata PK_7480cbc274f7f90b1225ba14f94; Type: CONSTRAINT; Schema: public; Owner: acs_admin
--

ALTER TABLE ONLY public.device_metadata
    ADD CONSTRAINT "PK_7480cbc274f7f90b1225ba14f94" PRIMARY KEY (id);


--
-- Name: users PK_a3ffb1c0c8416b9fc6f907b7433; Type: CONSTRAINT; Schema: public; Owner: acs_admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);


--
-- Name: device_actions PK_b6ec4544fe0a5b632f3ff5a3f6e; Type: CONSTRAINT; Schema: public; Owner: acs_admin
--

ALTER TABLE ONLY public.device_actions
    ADD CONSTRAINT "PK_b6ec4544fe0a5b632f3ff5a3f6e" PRIMARY KEY (id);


--
-- Name: provisioning_jobs PK_e4d20ac3a2168bf791678a4665b; Type: CONSTRAINT; Schema: public; Owner: acs_admin
--

ALTER TABLE ONLY public.provisioning_jobs
    ADD CONSTRAINT "PK_e4d20ac3a2168bf791678a4665b" PRIMARY KEY (id);


--
-- Name: users UQ_97672ac88f789774dd47f7c8be3; Type: CONSTRAINT; Schema: public; Owner: acs_admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE (email);


--
-- Name: device_groups device_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: acs_admin
--

ALTER TABLE ONLY public.device_groups
    ADD CONSTRAINT device_groups_pkey PRIMARY KEY (id);


--
-- Name: IDX_030267a2ccc9cc47ddf8debd9b; Type: INDEX; Schema: public; Owner: acs_admin
--

CREATE INDEX "IDX_030267a2ccc9cc47ddf8debd9b" ON public.device_groups USING btree (status);


--
-- Name: IDX_1d2942ac9c35a35e7d254a14a9; Type: INDEX; Schema: public; Owner: acs_admin
--

CREATE INDEX "IDX_1d2942ac9c35a35e7d254a14a9" ON public.provisioning_jobs USING btree (status);


--
-- Name: IDX_1d5471c32a34ccd9da5e712350; Type: INDEX; Schema: public; Owner: acs_admin
--

CREATE INDEX "IDX_1d5471c32a34ccd9da5e712350" ON public.device_metadata USING btree ("operationalMode");


--
-- Name: IDX_20afa464038e1d70cd3fd5aac1; Type: INDEX; Schema: public; Owner: acs_admin
--

CREATE INDEX "IDX_20afa464038e1d70cd3fd5aac1" ON public.device_alert_states USING btree (severity);


--
-- Name: IDX_3b9c9d520fe16a5735dca8e45f; Type: INDEX; Schema: public; Owner: acs_admin
--

CREATE INDEX "IDX_3b9c9d520fe16a5735dca8e45f" ON public.provisioning_templates USING btree (name);


--
-- Name: IDX_48d2e924f440c0fb60e32e8dfd; Type: INDEX; Schema: public; Owner: acs_admin
--

CREATE INDEX "IDX_48d2e924f440c0fb60e32e8dfd" ON public.provisioning_templates USING btree (status);


--
-- Name: IDX_60c58cb9a6bb2c2b1914914b74; Type: INDEX; Schema: public; Owner: acs_admin
--

CREATE UNIQUE INDEX "IDX_60c58cb9a6bb2c2b1914914b74" ON public.device_alert_states USING btree ("alertKey");


--
-- Name: IDX_75be350bd61d37b3597b01d447; Type: INDEX; Schema: public; Owner: acs_admin
--

CREATE INDEX "IDX_75be350bd61d37b3597b01d447" ON public.device_actions USING btree ("actionType");


--
-- Name: IDX_81cf11f505270d197e7c559643; Type: INDEX; Schema: public; Owner: acs_admin
--

CREATE INDEX "IDX_81cf11f505270d197e7c559643" ON public.provisioning_templates USING btree ("productClass");


--
-- Name: IDX_84d2dfcb096662dfe895555e13; Type: INDEX; Schema: public; Owner: acs_admin
--

CREATE INDEX "IDX_84d2dfcb096662dfe895555e13" ON public.device_groups USING btree (name);


--
-- Name: IDX_85351f47e457e1b9f05b069137; Type: INDEX; Schema: public; Owner: acs_admin
--

CREATE INDEX "IDX_85351f47e457e1b9f05b069137" ON public.device_actions USING btree (status);


--
-- Name: IDX_8b588587c07767cea29fc7fb43; Type: INDEX; Schema: public; Owner: acs_admin
--

CREATE INDEX "IDX_8b588587c07767cea29fc7fb43" ON public.device_alert_states USING btree ("deviceId");


--
-- Name: IDX_8d7e9c29daf0974600c4335cc4; Type: INDEX; Schema: public; Owner: acs_admin
--

CREATE UNIQUE INDEX "IDX_8d7e9c29daf0974600c4335cc4" ON public.device_metadata USING btree ("deviceId");


--
-- Name: IDX_96e8732c414e65d6a87dc0f0a7; Type: INDEX; Schema: public; Owner: acs_admin
--

CREATE INDEX "IDX_96e8732c414e65d6a87dc0f0a7" ON public.provisioning_jobs USING btree (name);


--
-- Name: IDX_9d72d47d2502413b39a1e20a92; Type: INDEX; Schema: public; Owner: acs_admin
--

CREATE INDEX "IDX_9d72d47d2502413b39a1e20a92" ON public.provisioning_jobs USING btree ("templateId");


--
-- Name: IDX_ab3697af555e4ba730d0aac816; Type: INDEX; Schema: public; Owner: acs_admin
--

CREATE INDEX "IDX_ab3697af555e4ba730d0aac816" ON public.provisioning_templates USING btree (vendor);


--
-- Name: IDX_aff36acbba423a725193e59fcc; Type: INDEX; Schema: public; Owner: acs_admin
--

CREATE INDEX "IDX_aff36acbba423a725193e59fcc" ON public.device_actions USING btree ("deviceId");


--
-- Name: IDX_b7ed4dacd4700f099c2d66fe41; Type: INDEX; Schema: public; Owner: acs_admin
--

CREATE INDEX "IDX_b7ed4dacd4700f099c2d66fe41" ON public.device_alert_states USING btree (status);


--
-- Name: IDX_cd4184dedb08a9ee6c62327128; Type: INDEX; Schema: public; Owner: acs_admin
--

CREATE INDEX "IDX_cd4184dedb08a9ee6c62327128" ON public.device_alert_states USING btree (category);


--
-- Name: IDX_efb934cb9b6b1461d2ab0168d1; Type: INDEX; Schema: public; Owner: acs_admin
--

CREATE INDEX "IDX_efb934cb9b6b1461d2ab0168d1" ON public.provisioning_templates USING btree (model);


--
-- Name: IDX_fcc2567663d57272a966cba0a5; Type: INDEX; Schema: public; Owner: acs_admin
--

CREATE INDEX "IDX_fcc2567663d57272a966cba0a5" ON public.provisioning_jobs USING btree ("groupId");


--
-- PostgreSQL database dump complete
--

\unrestrict 0uh9HJQiyddRbaN7J2ZhCgMdLgdaeckmLgouRuxXsBP8ZnSjmjKFhhDiC3iaWUf

