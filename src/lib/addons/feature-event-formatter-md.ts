import {
    FEATURE_ARCHIVED,
    FEATURE_CREATED,
    FEATURE_ENVIRONMENT_DISABLED,
    FEATURE_ENVIRONMENT_ENABLED,
    FEATURE_METADATA_UPDATED,
    FEATURE_PROJECT_CHANGE,
    FEATURE_REVIVED,
    FEATURE_STALE_OFF,
    FEATURE_STALE_ON,
    FEATURE_STRATEGY_ADD,
    FEATURE_STRATEGY_REMOVE,
    FEATURE_STRATEGY_UPDATE,
    FEATURE_UPDATED,
    FEATURE_VARIANTS_UPDATED,
    IEvent,
} from '../types';

export interface FeatureEventFormatter {
    format: (event: IEvent) => string;
    featureLink: (event: IEvent) => string;
}

export enum LinkStyle {
    SLACK,
    MD,
}

export class FeatureEventFormatterMd implements FeatureEventFormatter {
    private unleashUrl: string;

    private linkStyle: LinkStyle;

    constructor(unleashUrl: string, linkStyle: LinkStyle = LinkStyle.MD) {
        this.unleashUrl = unleashUrl;
        this.linkStyle = linkStyle;
    }

    generateArchivedText(event: IEvent): string {
        const { createdBy, type } = event;
        const action = type === FEATURE_ARCHIVED ? 'archived' : 'revived';
        const feature = this.generateFeatureLink(event);
        return ` ${createdBy} just ${action} feature toggle *${feature}*`;
    }

    generateFeatureLink(event: IEvent): string {
        if (this.linkStyle === LinkStyle.SLACK) {
            return `<${this.featureLink(event)}|${event.featureName}>`;
        } else {
            return `[${event.featureName}](${this.featureLink(event)})`;
        }
    }

    generateStaleText(event: IEvent): string {
        const { createdBy, type } = event;
        const isStale = type === FEATURE_STALE_ON;
        const feature = this.generateFeatureLink(event);

        if (isStale) {
            return `${createdBy} marked ${feature}  as stale and this feature toggle is now *ready to be removed* from the code.`;
        }
        return `${createdBy} removed the stale marking on *${feature}*.`;
    }

    generateEnvironmentToggleText(event: IEvent): string {
        const { createdBy, environment, type, project } = event;
        const toggleStatus =
            type === FEATURE_ENVIRONMENT_ENABLED ? 'enabled' : 'disabled';
        const feature = this.generateFeatureLink(event);
        return `${createdBy} *${toggleStatus}* ${feature} in *${environment}* environment in project *${project}*`;
    }

    generateStrategyChangeText(event: IEvent): string {
        const { createdBy, environment, project, data, preData } = event;
        const feature = this.generateFeatureLink(event);
        const map = {
            ['flexibleRollout']: () =>
                this.flexibleRolloutStrategyChangeText(
                    preData,
                    data,
                    environment,
                ),
            ['default']: () =>
                this.defaultStrategyChangeText(preData, data, environment),
        };
        const strategyText = map.hasOwnProperty(data.name)
            ? map[data.name]()
            : `by updating strategy ${data?.name} in *${environment}*`;
        return `${createdBy} updated *${feature}* in project *${project}* ${strategyText}`;
    }

    private flexibleRolloutStrategyChangeText(
        preData,
        data,
        environment: string,
    ) {
        const { rollout: oldRollout, stickiness: oldStickiness } =
            preData.parameters;
        const { rollout, stickiness } = data.parameters;
        const stickinessText =
            oldStickiness === stickiness
                ? ''
                : ` from ${oldStickiness} stickiness to ${stickiness}`;
        const rolloutText =
            oldRollout === rollout ? '' : ` from ${oldRollout}% to ${rollout}%`;
        return `by updating strategy ${data?.name} in *${environment}*${stickinessText}${rolloutText}`;
    }

    private defaultStrategyChangeText(preData, data, environment: string) {
        const constraintOperatorDescriptions = {
            IN: 'is one of',
            NOT_IN: 'is not one of',
            STR_CONTAINS: 'is a string that contains',
            STR_STARTS_WITH: 'is a string that starts with',
            STR_ENDS_WITH: 'is a string that ends with',
            NUM_EQ: 'is a number equal to',
            NUM_GT: 'is a number greater than',
            NUM_GTE: 'is a number greater than or equal to',
            NUM_LT: 'is a number less than',
            NUM_LTE: 'is a number less than or equal to',
            DATE_BEFORE: 'is a date before',
            DATE_AFTER: 'is a date after',
            SEMVER_EQ: 'is a SemVer equal to',
            SEMVER_GT: 'is a SemVer greater than',
            SEMVER_LT: 'is a SemVer less than',
        };
        const formatConstraint = (constraint) => {
            const val = constraint.hasOwnProperty('value')
                ? constraint.value
                : `(${constraint.values.join(',')})`;
            const operator = constraintOperatorDescriptions.hasOwnProperty(
                constraint.operator,
            )
                ? constraintOperatorDescriptions[constraint.operator]
                : constraint.operator;

            return `${constraint.contextName} ${
                constraint.inverted ? 'not ' : ''
            }${operator} ${val}`;
        };

        const constraintStrings = (constraints) =>
            constraints.length === 0
                ? 'empty set of constraints'
                : `[${constraints.map(formatConstraint).join(', ')}]`;

        const oldConstraints = constraintStrings(preData.constraints);
        const newConstraints = constraintStrings(data.constraints);
        return `by updating strategy ${data?.name} in *${environment}* from ${oldConstraints} to ${newConstraints}`;
    }

    generateStrategyRemoveText(event: IEvent): string {
        const { createdBy, environment, project, preData } = event;
        const feature = this.generateFeatureLink(event);
        return `${createdBy} updated *${feature}* in project *${project}* by removing strategy ${preData?.name} in *${environment}*`;
    }

    generateStrategyAddText(event: IEvent): string {
        const { createdBy, environment, project, data } = event;
        const feature = this.generateFeatureLink(event);
        return `${createdBy} updated *${feature}* in project *${project}* by adding strategy ${data?.name} in *${environment}*`;
    }

    generateMetadataText(event: IEvent): string {
        const { createdBy, project } = event;
        const feature = this.generateFeatureLink(event);
        return `${createdBy} updated the metadata for ${feature} in project *${project}*`;
    }

    generateProjectChangeText(event: IEvent): string {
        const { createdBy, project, featureName } = event;
        return `${createdBy} moved ${featureName} to ${project}`;
    }

    featureLink(event: IEvent): string {
        const { type, project = '', featureName } = event;
        if (type === FEATURE_ARCHIVED) {
            if (project) {
                return `${this.unleashUrl}/projects/${project}/archive`;
            }
            return `${this.unleashUrl}/archive`;
        }

        return `${this.unleashUrl}/projects/${project}/features/${featureName}`;
    }

    getAction(type: string): string {
        switch (type) {
            case FEATURE_CREATED:
                return 'created';
            case FEATURE_UPDATED:
                return 'updated';
            case FEATURE_VARIANTS_UPDATED:
                return 'updated variants for';
            default:
                return type;
        }
    }

    defaultText(event: IEvent): string {
        const { createdBy, project, type } = event;
        const action = this.getAction(type);
        const feature = this.generateFeatureLink(event);
        return `${createdBy} ${action} feature toggle ${feature} in project *${project}*`;
    }

    format(event: IEvent): string {
        switch (event.type) {
            case FEATURE_ARCHIVED:
            case FEATURE_REVIVED:
                return this.generateArchivedText(event);
            case FEATURE_STALE_ON:
            case FEATURE_STALE_OFF:
                return this.generateStaleText(event);
            case FEATURE_ENVIRONMENT_DISABLED:
            case FEATURE_ENVIRONMENT_ENABLED:
                return this.generateEnvironmentToggleText(event);
            case FEATURE_STRATEGY_REMOVE:
                return this.generateStrategyRemoveText(event);
            case FEATURE_STRATEGY_ADD:
                return this.generateStrategyAddText(event);
            case FEATURE_STRATEGY_UPDATE:
                return this.generateStrategyChangeText(event);
            case FEATURE_METADATA_UPDATED:
                return this.generateMetadataText(event);
            case FEATURE_PROJECT_CHANGE:
                return this.generateProjectChangeText(event);
            default:
                return this.defaultText(event);
        }
    }
}
