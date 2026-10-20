import express from 'express';
import bodyParser from 'body-parser';
import { createReadStream } from 'node:fs';
import crypto from 'node:crypto';
import http from 'node:http';
import createApp from './app.js';

const app = createApp(express, bodyParser, createReadStream, crypto, http);

app.listen(process.env.PORT || 3000);
