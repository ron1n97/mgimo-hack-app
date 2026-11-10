import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AiController } from './ai.controller';

describe('POST /ai/chat auth', () => {
  it('AiController is guarded by JwtAuthGuard (chat inherits)', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      AiController,
    ) as unknown[];
    expect(guards).toBeDefined();
    expect(guards).toContain(JwtAuthGuard);
  });

  it('exposes chat handler on controller prototype', () => {
    expect(typeof AiController.prototype.chat).toBe('function');
  });
});
