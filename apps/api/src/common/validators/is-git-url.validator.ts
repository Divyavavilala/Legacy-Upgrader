import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';

const GIT_URL_PATTERN =
  /^(?:https?:\/\/|git@|ssh:\/\/)[^\s]+\.git(?:\/)?$|^(?:https?:\/\/|git@)[^\s]+$/i;

export function IsGitUrl(validationOptions?: ValidationOptions) {
  return function gitUrlDecorator(object: object, propertyName: string) {
    registerDecorator({
      name: 'isGitUrl',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          if (typeof value !== 'string' || value.length === 0) {
            return false;
          }
          return GIT_URL_PATTERN.test(value.trim());
        },
        defaultMessage() {
          return 'gitUrl must be a valid Git repository URL (https, git@, or ssh)';
        },
      },
    });
  };
}
