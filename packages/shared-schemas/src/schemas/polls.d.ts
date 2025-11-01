export declare const pollsSchema: import("drizzle-orm/pg-core").PgSchema<"polls">;
interface ResponseGroup {
    label: string;
    values: number[];
}
interface Question {
    varName: string;
    batteryName: string;
    subBattery: string;
}
interface SessionConfig {
    responseQuestions: (Question & {
        responseGroups: {
            expanded: ResponseGroup[];
            collapsed: ResponseGroup[];
        };
    })[];
    groupingQuestions: (Question & {
        responseGroups: ResponseGroup[];
    })[];
}
export declare const sessions: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "sessions";
    schema: "polls";
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "sessions";
            dataType: "number";
            columnType: "PgSerial";
            data: number;
            driverParam: number;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        sessionConfig: import("drizzle-orm/pg-core").PgColumn<{
            name: "session_config";
            tableName: "sessions";
            dataType: "json";
            columnType: "PgJsonb";
            data: SessionConfig;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: SessionConfig;
        }>;
        description: import("drizzle-orm/pg-core").PgColumn<{
            name: "description";
            tableName: "sessions";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "sessions";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export declare const questions: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "questions";
    schema: "polls";
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "questions";
            dataType: "number";
            columnType: "PgSerial";
            data: number;
            driverParam: number;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        sessionId: import("drizzle-orm/pg-core").PgColumn<{
            name: "sessionId";
            tableName: "questions";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        varName: import("drizzle-orm/pg-core").PgColumn<{
            name: "varName";
            tableName: "questions";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        batteryName: import("drizzle-orm/pg-core").PgColumn<{
            name: "batteryName";
            tableName: "questions";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        subBattery: import("drizzle-orm/pg-core").PgColumn<{
            name: "subBattery";
            tableName: "questions";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export declare const respondents: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "respondents";
    schema: "polls";
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "respondents";
            dataType: "number";
            columnType: "PgSerial";
            data: number;
            driverParam: number;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        sessionId: import("drizzle-orm/pg-core").PgColumn<{
            name: "sessionId";
            tableName: "respondents";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export declare const responses: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "responses";
    schema: "polls";
    columns: {
        respondentId: import("drizzle-orm/pg-core").PgColumn<{
            name: "respondentId";
            tableName: "responses";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        questionSessionId: import("drizzle-orm/pg-core").PgColumn<{
            name: "questionSessionId";
            tableName: "responses";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        response: import("drizzle-orm/pg-core").PgColumn<{
            name: "response";
            tableName: "responses";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
interface Split {
    groups: {
        question: Question;
        responseGroup: ResponseGroup | null;
    }[];
    responseQuestions: (Question & {
        responseGroups: {
            expanded: (ResponseGroup & {
                proportion: number;
            })[];
            collapsed: (ResponseGroup & {
                proportion: number;
            })[];
        };
    })[];
}
export declare const sessionStatistics: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "session_statistics";
    schema: "polls";
    columns: {
        sessionId: import("drizzle-orm/pg-core").PgColumn<{
            name: "sessionId";
            tableName: "session_statistics";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        statistics: import("drizzle-orm/pg-core").PgColumn<{
            name: "statistics";
            tableName: "session_statistics";
            dataType: "json";
            columnType: "PgJsonb";
            data: Split[];
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: Split[];
        }>;
        computedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "computed_at";
            tableName: "session_statistics";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export {};
//# sourceMappingURL=polls.d.ts.map