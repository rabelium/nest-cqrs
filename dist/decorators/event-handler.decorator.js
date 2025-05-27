"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventHandler = exports.EVENT_HANDLER_METADATA = void 0;
const common_1 = require("@nestjs/common");
const event_handler_metadata_1 = require("./event-handler-metadata");
Object.defineProperty(exports, "EVENT_HANDLER_METADATA", { enumerable: true, get: function () { return event_handler_metadata_1.EVENT_HANDLER_METADATA; } });
const EventHandler = (eventName) => (0, common_1.SetMetadata)(event_handler_metadata_1.EVENT_HANDLER_METADATA, eventName);
exports.EventHandler = EventHandler;
