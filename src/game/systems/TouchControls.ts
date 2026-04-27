import Phaser from 'phaser';
import {
  TOUCH_JOYSTICK_RADIUS,
  UI_ACTION_AMBER_KEY,
  UI_ACTION_TEAL_KEY,
  UI_JOYSTICK_KNOB_KEY,
  UI_JOYSTICK_RING_KEY,
} from '../utils/constants';
import { AttackInput, TouchInput } from '../utils/types';

export class TouchControls {
  private joystickBase: Phaser.GameObjects.Image;
  private joystickKnob: Phaser.GameObjects.Image;
  private buttons: Record<keyof AttackInput, Phaser.GameObjects.Container>;
  private pointerId: number | null = null;
  private origin = new Phaser.Math.Vector2(0, 0);
  private center = new Phaser.Math.Vector2(92, 426);
  private movement = new Phaser.Math.Vector2(0, 0);
  private actions: AttackInput = { punch: false, kick: false, jump: false, special: false, shoot: false, evade: false };
  private touchControlsVisible = false;
  private touchPreferred = false;
  private lastTouchActivityAt = 0;

  constructor(private scene: Phaser.Scene) {
    this.joystickBase = scene.add.image(92, 426, UI_JOYSTICK_RING_KEY)
      .setDisplaySize(116, 116)
      .setAlpha(0.66);
    this.joystickKnob = scene.add.image(92, 426, UI_JOYSTICK_KNOB_KEY)
      .setDisplaySize(52, 52)
      .setAlpha(0.74);
    this.buttons = {
      punch: this.createButton(826, 404, 'PUNCH', 0xffd166),
      kick: this.createButton(738, 438, 'KICK', 0xef476f),
      jump: this.createButton(834, 482, 'JUMP', 0x06d6a0),
      special: this.createButton(906, 436, 'SP', 0x8ecae6),
      shoot: this.createButton(904, 350, 'SHOT', 0x8ecae6),
      evade: this.createButton(832, 336, 'EVD', 0x8ecae6),
    };

    this.setDepth();
    this.setControlsVisible(false, true);
    this.bindPointerEvents();
  }

  updateLayout(width: number, height: number): void {
    const portraitLike = height > width * 1.25;
    this.touchPreferred = portraitLike;
    const controlScale = portraitLike ? 0.78 : 0.84;
    const leftX = portraitLike ? 68 : 82;
    const bottomY = height - (portraitLike ? 52 : 64);
    this.center.set(leftX, bottomY);
    this.joystickBase.setPosition(leftX, bottomY);
    this.joystickKnob.setPosition(leftX + this.movement.x * 34, bottomY + this.movement.y * 34);
    this.joystickBase.setDisplaySize(116 * controlScale, 116 * controlScale);
    this.joystickKnob.setDisplaySize(52 * controlScale, 52 * controlScale);

    this.buttons.punch.setPosition(width - (portraitLike ? 100 : 112), height - (portraitLike ? 86 : 104));
    this.buttons.evade.setPosition(width - (portraitLike ? 162 : 180), height - (portraitLike ? 54 : 68));
    this.buttons.jump.setPosition(width - (portraitLike ? 98 : 110), height - (portraitLike ? 26 : 36));
    this.buttons.special.setPosition(width - (portraitLike ? 42 : 52), height - (portraitLike ? 58 : 70));
    this.buttons.shoot.setPosition(width - (portraitLike ? 44 : 54), height - (portraitLike ? 126 : 146));
    this.buttons.kick.setPosition(width - (portraitLike ? 108 : 118), height - (portraitLike ? 150 : 170));
    Object.values(this.buttons).forEach((button) => button.setScale(controlScale));
    this.setControlsVisible(this.touchPreferred || this.touchControlsVisible, true);
  }

  getInput(): TouchInput {
    if (!this.touchPreferred && this.touchControlsVisible && this.scene.time.now - this.lastTouchActivityAt > 2500) {
      this.setControlsVisible(false);
    }

    const input = {
      movement: { x: this.movement.x, y: this.movement.y },
      actions: { ...this.actions },
      run: this.movement.length() > 0.82,
    };

    this.actions.punch = false;
    this.actions.kick = false;
    this.actions.jump = false;
    this.actions.special = false;
    this.actions.shoot = false;
    this.actions.evade = false;
    return input;
  }

  private bindPointerEvents(): void {
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isTouchPointer(pointer)) {
        this.lastTouchActivityAt = this.scene.time.now;
        this.setControlsVisible(true);
      }

      if (!this.isInsideJoystick(pointer) || this.pointerId !== null) {
        return;
      }

      this.pointerId = pointer.id;
      this.origin.copy(this.center);
      this.updateMovement(pointer);
    });

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.pointerId) {
        this.lastTouchActivityAt = this.scene.time.now;
        this.updateMovement(pointer);
      }
    });

    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => this.releasePointer(pointer));
    this.scene.input.on('pointerupoutside', (pointer: Phaser.Input.Pointer) => this.releasePointer(pointer));
    this.scene.input.on('pointercancel', (pointer: Phaser.Input.Pointer) => this.releasePointer(pointer));
    this.scene.input.on('gameout', () => this.releaseAllPointers());
  }

  private releasePointer(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.pointerId) {
      return;
    }

    this.releaseAllPointers();
  }

  private releaseAllPointers(): void {
    this.pointerId = null;
    this.movement.set(0, 0);
    this.joystickKnob.setPosition(this.center.x, this.center.y);
  }

  private updateMovement(pointer: Phaser.Input.Pointer): void {
    const delta = new Phaser.Math.Vector2(pointer.x - this.origin.x, pointer.y - this.origin.y);
    if (delta.length() > TOUCH_JOYSTICK_RADIUS) {
      delta.setLength(TOUCH_JOYSTICK_RADIUS);
    }
    this.movement.set(delta.x / TOUCH_JOYSTICK_RADIUS, delta.y / TOUCH_JOYSTICK_RADIUS);
    this.joystickKnob.setPosition(this.center.x + this.movement.x * 34, this.center.y + this.movement.y * 34);
  }

  private isInsideJoystick(pointer: Phaser.Input.Pointer): boolean {
    return Phaser.Math.Distance.Between(pointer.x, pointer.y, this.center.x, this.center.y) <= TOUCH_JOYSTICK_RADIUS * 1.45;
  }

  private isTouchPointer(pointer: Phaser.Input.Pointer): boolean {
    const event = pointer.event as PointerEvent | undefined;
    return event?.pointerType === 'touch' || event?.pointerType === 'pen';
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    color: number,
  ): Phaser.GameObjects.Container {
    const key = color === 0xffd166 ? UI_ACTION_AMBER_KEY : UI_ACTION_TEAL_KEY;
    const circle = this.scene.add.image(0, 0, key)
      .setDisplaySize(64, 64)
      .setAlpha(0.74);
    const text = this.scene.add.text(0, 0, label, {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: label.length > 4 ? '9px' : '10px',
      color: '#ffffff',
      stroke: '#07090d',
      strokeThickness: 3,
    });
    text.setOrigin(0.5);

    const container = this.scene.add.container(x, y, [circle, text]);
    container.setSize(64, 64);
    container.setInteractive(new Phaser.Geom.Circle(0, 0, 34), Phaser.Geom.Circle.Contains);
    container.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.lastTouchActivityAt = this.scene.time.now;
      this.setControlsVisible(true);
      const keyName = label === 'SP' ? 'special' : label === 'SHOT' ? 'shoot' : label === 'EVD' ? 'evade' : (label.toLowerCase() as keyof AttackInput);
      this.actions[keyName] = true;
      pointer.event?.stopPropagation();
    });
    return container;
  }

  private setControlsVisible(visible: boolean, immediate = false): void {
    if (visible === this.touchControlsVisible && !immediate) {
      return;
    }

    this.touchControlsVisible = visible;
    const alpha = visible ? 1 : 0;
    const targets = [this.joystickBase, this.joystickKnob, ...Object.values(this.buttons)];
    targets.forEach((target) => target.setVisible(visible || immediate));
    if (immediate) {
      targets.forEach((target) => target.setAlpha(alpha));
      return;
    }

    this.scene.tweens.add({
      targets,
      alpha,
      duration: 160,
      ease: 'Sine.easeOut',
      onComplete: () => {
        if (!this.touchControlsVisible) {
          targets.forEach((target) => target.setVisible(false));
        }
      },
    });
  }

  private setDepth(): void {
    this.joystickBase.setScrollFactor(0).setDepth(10000);
    this.joystickKnob.setScrollFactor(0).setDepth(10001);
    Object.values(this.buttons).forEach((button) => button.setScrollFactor(0).setDepth(10001));
  }
}
