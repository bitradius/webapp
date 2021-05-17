// Copyright (c) 2019-2021, BitRadius Holdings, LLC
//
// Please see the included LICENSE file for more information.

import * as Express from 'express';
import * as BodyParser from 'body-parser';
import * as Helmet from 'helmet';
import * as Compression from 'compression';
import * as dotenv from 'dotenv';
import { EventEmitter } from 'events';
import * as path from 'path';
import { RequestHandler, Response } from 'express';

dotenv.config();

export default class WebApp extends EventEmitter {
    private readonly m_app: Express.Application = Express();

    /**
     * Constructs a basic framework for a new web application for a REST application
     * @param m_bindPort
     * @param m_bindIP
     * @param m_backlog
     */
    constructor (private m_bindPort = 80, private m_bindIP = '0.0.0.0', private m_backlog = 511) {
        super();

        this.m_app.use((request, response, next) => {
            response.header('X-Requested-With',
                '*');
            response.header('Access-Control-Allow-Origin',
                process.env.CORS_DOMAIN || '*');
            response.header('Access-Control-Allow-Headers',
                'Origin, X-Requested-With, Content-Type, Accept, User-Agent');
            response.header('Access-Control-Allow-Methods',
                'GET, HEAD, POST, PUT, DELETE, CONNECT, OPTIONS, TRACE, PATCH');
            response.header('Cache-Control',
                'max-age=30, public');
            response.header('Referrer-Policy',
                'no-referrer');
            response.header('Content-Security-Policy',
                'default-src \'none\'');
            response.header('Feature-Policy',
                'geolocation none;midi none;notifications none;push none;sync-xhr none;microphone none;' +
                'camera none;magnetometer none;gyroscope none;speaker self;vibrate none;fullscreen self;' +
                'payment none;');
            response.header('Permissions-Policy', 'geolocation=(), midi=(), notifications=(), push=(), ' +
                'sync-xhr=(), microphone=(), camera=(), magnetometer=(), gyroscope=(), speaker=(self), vibrate=(), ' +
                'fullscreen=(self), payment=()');

            return next();
        });

        this.m_app.use(Helmet());

        if (process.env.USE_COMPRESSION &&
            (process.env.USE_COMPRESSION.toLowerCase() === 'true' || process.env.USE_COMPRESSION === '1')) {
            this.m_app.use(Compression());
        }

        this.m_app.use((request, response, next) => {
            this.emit(
                'request',
                request.header('x-forwarded-for') || request.header('cf-connecting-ip') || request.ip,
                request.method,
                request.url);

            return next();
        });

        this.on('ready', () => {
            this.m_app.options('*', (request, response) => {
                return response.sendStatus(200).send();
            });

            this.m_app.all('*', (request, response) => {
                return response.sendStatus(404).send();
            });
        });
    }

    public on (event: 'ready', listener: () => void): this;

    public on (event: 'request', listener: (remote_ip: string, method: string, url: string) => void): this;

    public on (event: 'error', listener: (error: Error) => void): this;

    public on (event: any, listener: (...args: any[]) => void): this {
        return super.on(event, listener);
    }

    /**
     * Returns the underlying express application
     */
    public get application (): Express.Application {
        return this.m_app;
    }

    /**
     * Returns a RequestHandler for static content
     * @param local_path
     */
    public static_content (local_path: string): RequestHandler<Response> {
        return Express.static(path.resolve(local_path));
    }

    /**
     * Creates a new instance of the application server
     * @param port
     * @param ip
     * @param backlog
     */
    public static async create (
        port = 80, ip = '0.0.0.0', backlog = 511): Promise<[WebApp, Express.Application]> {
        const instance = new WebApp(port, ip, backlog);

        return [instance, instance.application];
    }

    /**
     * Enables automatic parsing/handling of request body content as JSON
     */
    public async enable_auto_body_json_parsing (): Promise<void> {
        this.m_app.use(BodyParser.json());

        this.m_app.use((
            error: Error, request: Express.Request, response: Express.Response, next: Express.NextFunction) => {
            if (error instanceof SyntaxError) {
                this.emit('error', error);

                return response.sendStatus(400).send();
            }

            return next();
        });
    }

    /**
     * Enables automatic parsing/handling of request body content as raw data
     */
    public async enable_auto_body_raw_parsing (): Promise<void> {
        this.m_app.use(BodyParser.raw());

        this.m_app.use((
            error: Error, request: Express.Request, response: Express.Response, next: Express.NextFunction) => {
            if (error instanceof SyntaxError) {
                this.emit('error', error);

                return response.sendStatus(400).send();
            }

            return next();
        });
    }

    /**
     * Enables automatic parsing/handling of request body content as text
     */
    public async enable_auto_body_text_parsing (): Promise<void> {
        this.m_app.use(BodyParser.text());

        this.m_app.use((
            error: Error, request: Express.Request, response: Express.Response, next: Express.NextFunction) => {
            if (error instanceof SyntaxError) {
                this.emit('error', error);

                return response.sendStatus(400).send();
            }

            return next();
        });
    }

    /**
     * Enables automatic parsing/handling of request body content as URL encoded data
     */
    public async enable_auto_body_urlencoding_parsing (): Promise<void> {
        this.m_app.use(BodyParser.urlencoded());

        this.m_app.use((
            error: Error, request: Express.Request, response: Express.Response, next: Express.NextFunction) => {
            if (error instanceof SyntaxError) {
                this.emit('error', error);

                return response.sendStatus(400).send();
            }

            return next();
        });
    }

    /**
     * Starts the webservice
     */
    public async start (): Promise<void> {
        return new Promise((resolve, reject) => {
            this.m_app.listen(this.m_bindPort, this.m_bindIP, this.m_backlog, (error?: Error) => {
                if (error) {
                    this.emit('error', error);

                    return reject(error);
                }

                this.emit('ready');

                return resolve();
            });
        });
    }
}
